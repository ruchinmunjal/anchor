import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:drift/drift.dart' as drift;
import '../../../../core/database/app_database.dart';
import '../../../../core/network/dio_provider.dart';
import '../../domain/note.dart' as domain;

part 'notes_repository.g.dart';

const _lastSyncKey = 'last_synced_at';

@riverpod
NotesRepository notesRepository(Ref ref) {
  final db = ref.watch(appDatabaseProvider);
  final dio = ref.watch(dioProvider);
  const storage = FlutterSecureStorage();
  return NotesRepository(db, dio, storage);
}

class NotesRepository {
  final AppDatabase _db;
  final Dio _dio;
  final FlutterSecureStorage _storage;

  NotesRepository(this._db, this._dio, this._storage);

  // Watch only active notes
  Stream<List<domain.Note>> watchNotes() {
    final query = _db.select(_db.notes)
      ..where((tbl) => tbl.state.equals('active'))
      ..orderBy([
        (t) => drift.OrderingTerm(
          expression: t.isPinned,
          mode: drift.OrderingMode.desc,
        ),
        (t) => drift.OrderingTerm(
          expression: t.updatedAt,
          mode: drift.OrderingMode.desc,
        ),
      ]);
    return query.watch().map((rows) {
      return rows.map((row) => _mapToDomain(row)).toList();
    });
  }

  // Watch trashed notes for Trash screen
  Stream<List<domain.Note>> watchTrashedNotes() {
    final query = _db.select(_db.notes)
      ..where((tbl) => tbl.state.equals('trashed'))
      ..orderBy([
        (t) => drift.OrderingTerm(
          expression: t.updatedAt,
          mode: drift.OrderingMode.desc,
        ),
      ]);
    return query.watch().map((rows) {
      return rows.map((row) => _mapToDomain(row)).toList();
    });
  }

  Future<domain.Note?> getNote(String id) async {
    final row = await (_db.select(
      _db.notes,
    )..where((tbl) => tbl.id.equals(id))).getSingleOrNull();
    return row != null ? _mapToDomain(row) : null;
  }

  Future<void> createNote(domain.Note note) async {
    final noteWithTimestamp = note.copyWith(
      updatedAt: DateTime.now(),
      state: domain.NoteState.active,
    );
    await _db
        .into(_db.notes)
        .insert(
          _mapToData(noteWithTimestamp, isSynced: false),
          mode: drift.InsertMode.insertOrReplace,
        );
    _syncPushSingle(noteWithTimestamp, isNew: true);
  }

  Future<void> updateNote(domain.Note note) async {
    final noteWithTimestamp = note.copyWith(updatedAt: DateTime.now());
    await _db
        .update(_db.notes)
        .replace(_mapToData(noteWithTimestamp, isSynced: false));
    _syncPushSingle(noteWithTimestamp, isNew: false);
  }

  // Soft delete - moves note to trash
  Future<void> deleteNote(String id) async {
    final now = DateTime.now();
    await (_db.update(_db.notes)..where((tbl) => tbl.id.equals(id))).write(
      NotesCompanion(
        state: const drift.Value('trashed'),
        updatedAt: drift.Value(now),
        isSynced: const drift.Value(false),
      ),
    );

    // Sync delete to server
    try {
      await _dio.delete('/api/notes/$id');
      await (_db.update(_db.notes)..where((tbl) => tbl.id.equals(id))).write(
        const NotesCompanion(isSynced: drift.Value(true)),
      );
    } catch (e) {
      // Will be synced later
    }
  }

  // Restore from trash
  Future<void> restoreNote(String id) async {
    final now = DateTime.now();
    await (_db.update(_db.notes)..where((tbl) => tbl.id.equals(id))).write(
      NotesCompanion(
        state: const drift.Value('active'),
        updatedAt: drift.Value(now),
        isSynced: const drift.Value(false),
      ),
    );

    // Sync restore to server
    try {
      await _dio.patch('/api/notes/$id/restore');
      await (_db.update(_db.notes)..where((tbl) => tbl.id.equals(id))).write(
        const NotesCompanion(isSynced: drift.Value(true)),
      );
    } catch (e) {
      // Will be synced later
    }
  }

  // Permanent delete - sets state to deleted (tombstone)
  // The note will be removed locally after sync confirms server received it
  Future<void> permanentDelete(String id) async {
    final now = DateTime.now();
    await (_db.update(_db.notes)..where((tbl) => tbl.id.equals(id))).write(
      NotesCompanion(
        state: const drift.Value('deleted'),
        updatedAt: drift.Value(now),
        isSynced: const drift.Value(false),
      ),
    );

    // Sync permanent delete to server
    try {
      await _dio.delete('/api/notes/$id/permanent');
      // After server confirms, remove the tombstone locally
      await (_db.delete(_db.notes)..where((tbl) => tbl.id.equals(id))).go();
    } catch (e) {
      // Will be synced later, tombstone remains locally
    }
  }

  // Bulletproof bi-directional sync
  Future<void> sync() async {
    try {
      // 1. Get last sync timestamp
      final lastSyncedAt = await _storage.read(key: _lastSyncKey);

      // 2. Get all unsynced local notes (including tombstones)
      final unsyncedRows = await (_db.select(
        _db.notes,
      )..where((tbl) => tbl.isSynced.equals(false))).get();

      final localChanges = unsyncedRows.map((row) {
        final note = _mapToDomain(row);
        return {
          'id': note.id,
          'title': note.title,
          'content': note.content,
          'isPinned': note.isPinned,
          'isArchived': note.isArchived,
          'color': note.color,
          'state': note.state.name,
          'updatedAt': note.updatedAt?.toIso8601String(),
        };
      }).toList();

      // 3. Send sync request to server
      final response = await _dio.post(
        '/api/notes/sync',
        data: {'lastSyncedAt': lastSyncedAt, 'changes': localChanges},
      );

      final data = response.data as Map<String, dynamic>;
      final serverChanges = (data['serverChanges'] as List)
          .map((e) => domain.Note.fromJson(e as Map<String, dynamic>))
          .toList();
      final syncedAt = data['syncedAt'] as String;

      // 4. Process server changes with conflict resolution
      await _db.transaction(() async {
        for (final serverNote in serverChanges) {
          // If server note is deleted (tombstone), remove it locally
          if (serverNote.isDeleted) {
            await (_db.delete(
              _db.notes,
            )..where((tbl) => tbl.id.equals(serverNote.id))).go();
            continue;
          }

          final localNote = await (_db.select(
            _db.notes,
          )..where((tbl) => tbl.id.equals(serverNote.id))).getSingleOrNull();

          if (localNote == null) {
            // Note doesn't exist locally - insert it
            await _db
                .into(_db.notes)
                .insert(
                  _mapToData(serverNote, isSynced: true),
                  mode: drift.InsertMode.insertOrReplace,
                );
          } else {
            // Note exists - compare timestamps
            final serverUpdatedAt = serverNote.updatedAt;
            final localUpdatedAt = localNote.updatedAt;

            // Server wins if it's newer or equal (server is source of truth)
            if (serverUpdatedAt != null &&
                (localUpdatedAt == null ||
                    serverUpdatedAt.isAfter(localUpdatedAt) ||
                    serverUpdatedAt.isAtSameMomentAs(localUpdatedAt))) {
              await (_db.update(
                _db.notes,
              )..where((tbl) => tbl.id.equals(serverNote.id))).write(
                NotesCompanion(
                  title: drift.Value(serverNote.title),
                  content: drift.Value(serverNote.content),
                  isPinned: drift.Value(serverNote.isPinned),
                  isArchived: drift.Value(serverNote.isArchived),
                  color: drift.Value(serverNote.color),
                  state: drift.Value(serverNote.state.name),
                  updatedAt: drift.Value(serverNote.updatedAt),
                  isSynced: const drift.Value(true),
                ),
              );
            }
          }
        }

        // Mark all successfully pushed notes as synced
        final processedIds =
            (data['processedIds'] as List?)?.cast<String>() ?? [];
        for (final id in processedIds) {
          // Check if the note was a tombstone - if so, delete it locally
          final note = await (_db.select(
            _db.notes,
          )..where((tbl) => tbl.id.equals(id))).getSingleOrNull();
          if (note != null && note.state == 'deleted') {
            await (_db.delete(
              _db.notes,
            )..where((tbl) => tbl.id.equals(id))).go();
          } else {
            await (_db.update(_db.notes)..where((tbl) => tbl.id.equals(id)))
                .write(const NotesCompanion(isSynced: drift.Value(true)));
          }
        }
      });

      // 5. Save new sync timestamp
      await _storage.write(key: _lastSyncKey, value: syncedAt);
    } catch (e) {
      // Sync failed, will retry later
    }
  }

  // Push a single note to server (for immediate sync on create/update)
  Future<void> _syncPushSingle(domain.Note note, {required bool isNew}) async {
    try {
      final data = note.toJson();
      // Remove fields that shouldn't be sent to server
      data.remove('id');
      data.remove('state'); // Managed by server
      data.remove('updatedAt'); // Managed by Prisma @updatedAt

      if (isNew) {
        // New note - create directly on server
        final response = await _dio.post('/api/notes', data: data);
        final serverNote = domain.Note.fromJson(response.data);

        // Update local DB with server ID and data
        await _db.transaction(() async {
          await (_db.delete(
            _db.notes,
          )..where((tbl) => tbl.id.equals(note.id))).go();
          await _db
              .into(_db.notes)
              .insert(
                _mapToData(serverNote, isSynced: true),
                mode: drift.InsertMode.insertOrReplace,
              );
        });
      } else {
        // Existing note - update on server
        await _dio.patch('/api/notes/${note.id}', data: data);
        await (_db.update(_db.notes)..where((tbl) => tbl.id.equals(note.id)))
            .write(const NotesCompanion(isSynced: drift.Value(true)));
      }
    } catch (e) {
      // Will be synced in next full sync
    }
  }

  // Clear all local data
  Future<void> clearAll() async {
    // Clear all notes from DB
    await _db.delete(_db.notes).go();
    // Clear sync timestamp
    await _storage.delete(key: _lastSyncKey);
  }

  domain.Note _mapToDomain(Note row) {
    return domain.Note(
      id: row.id,
      title: row.title,
      content: row.content,
      isPinned: row.isPinned,
      isArchived: row.isArchived,
      color: row.color,
      state: domain.NoteState.fromString(row.state),
      updatedAt: row.updatedAt,
      isSynced: row.isSynced,
    );
  }

  Note _mapToData(domain.Note note, {required bool isSynced}) {
    return Note(
      id: note.id,
      title: note.title,
      content: note.content,
      isPinned: note.isPinned,
      isArchived: note.isArchived,
      color: note.color,
      state: note.state.name,
      updatedAt: note.updatedAt,
      isSynced: isSynced,
    );
  }
}
