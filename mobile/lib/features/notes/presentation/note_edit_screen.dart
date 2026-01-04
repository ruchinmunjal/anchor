import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:uuid/uuid.dart';
import 'package:anchor/features/notes/domain/note.dart';
import 'package:anchor/core/widgets/confirm_dialog.dart';
import 'package:anchor/core/widgets/app_snackbar.dart';
import 'package:anchor/core/widgets/rich_text_editor.dart';
import 'package:anchor/features/tags/presentation/widgets/tag_selector.dart';
import 'package:anchor/features/notes/presentation/widgets/note_background.dart';
import 'package:anchor/features/notes/presentation/widgets/note_background_picker.dart';
import '../data/repository/notes_repository.dart';

class NoteEditScreen extends ConsumerStatefulWidget {
  final String? noteId;
  final Note? note;
  const NoteEditScreen({super.key, this.noteId, this.note});

  @override
  ConsumerState<NoteEditScreen> createState() => _NoteEditScreenState();
}

class _NoteEditScreenState extends ConsumerState<NoteEditScreen> {
  final _titleController = TextEditingController();
  final _editorKey = GlobalKey<RichTextEditorState>();
  bool _isNew = true;
  bool _isDeleted = false;
  bool _isLoaded = false;
  bool _isEditing = false;
  bool _isPinned = false;
  bool _isArchived = false;
  Note? _existingNote;
  String? _initialContent;
  List<String> _selectedTagIds = [];
  String? _selectedBackground;

  @override
  void initState() {
    super.initState();
    if (widget.note != null) {
      // Note passed directly
      _isNew = false;
      _existingNote = widget.note;
      _isPinned = widget.note!.isPinned;
      _isArchived = widget.note!.isArchived;
      _titleController.text = widget.note!.title;
      _initialContent = widget.note!.content;
      _selectedTagIds = List.from(widget.note!.tagIds);
      _selectedBackground = widget.note!.background;
      _isLoaded = true;
      // Trashed notes are read-only
      if (widget.note!.isTrashed) {
        _isEditing = false;
      }
    } else if (widget.noteId != null) {
      // Fallback: fetch from repository if only ID is provided
      _isNew = false;
      _loadNote();
    } else {
      // New notes start in edit mode
      _isEditing = true;
      _isPinned = false;
      _isLoaded = true;
    }
  }

  void _startEditing() {
    // Don't allow editing if note is trashed
    if (_existingNote?.isTrashed == true) {
      return;
    }
    setState(() {
      _isEditing = true;
    });
  }

  Future<void> _loadNote() async {
    final note = await ref
        .read(notesRepositoryProvider)
        .getNote(widget.noteId!);
    if (note != null && mounted) {
      setState(() {
        _existingNote = note;
        _isPinned = note.isPinned;
        _isArchived = note.isArchived;
        _titleController.text = note.title;
        _initialContent = note.content;
        _selectedTagIds = List.from(note.tagIds);
        _selectedBackground = note.background;
        _isLoaded = true;
        // Trashed notes are read-only
        if (note.isTrashed) {
          _isEditing = false;
        }
      });
    }
  }

  Future<void> _togglePinned() async {
    // Don't allow pinning if note is trashed
    if (_existingNote?.isTrashed == true) {
      return;
    }
    setState(() {
      _isPinned = !_isPinned;
    });
    await _saveNote();
  }

  Future<void> _toggleArchived() async {
    if (_isNew) return;

    final wasArchived = _isArchived;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => ConfirmDialog(
        icon: LucideIcons.archive,
        iconColor: Theme.of(context).colorScheme.primary,
        title: wasArchived ? 'Unarchive Note' : 'Archive Note',
        message: wasArchived
            ? 'This note will be moved back to your notes.'
            : 'This note will be moved to archive.',
        cancelText: 'Cancel',
        confirmText: wasArchived ? 'Unarchive' : 'Archive',
        onConfirm: () {},
      ),
    );

    if (confirm != true || !mounted) return;

    final repository = ref.read(notesRepositoryProvider);
    try {
      if (wasArchived) {
        await repository.unarchiveNote(widget.noteId!);
      } else {
        await repository.archiveNote(widget.noteId!);
      }

      // Reload note to get updated state
      await _loadNote();

      // Show success snackbar
      if (mounted) {
        AppSnackbar.showSuccess(
          context,
          message: wasArchived ? 'Note unarchived' : 'Note archived',
        );

        // If archiving, go back after showing snackbar
        if (!wasArchived) {
          // Small delay to ensure snackbar is visible
          await Future.delayed(const Duration(milliseconds: 300));
          if (mounted) {
            context.pop();
          }
        }
      }
    } catch (e) {
      // Show error snackbar
      if (mounted) {
        AppSnackbar.showError(
          context,
          message: wasArchived
              ? 'Failed to unarchive note'
              : 'Failed to archive note',
        );
      }
    }
  }

  void _showColorPicker() {
    // Don't allow changing background if note is trashed
    if (_existingNote?.isTrashed == true) {
      return;
    }
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => NoteBackgroundPicker(
        selectedColor: _selectedBackground,
        onColorChanged: (color) {
          setState(() {
            _selectedBackground = color;
          });
          _saveNote();
        },
      ),
    );
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _saveNote() async {
    // Don't save if note is trashed (read-only)
    if (_existingNote?.isTrashed == true) {
      return;
    }

    final title = _titleController.text.trim();
    final editorState = _editorKey.currentState;
    final content = editorState?.getContent() ?? '';
    final plainText = editorState?.getPlainText() ?? '';

    if (title.isEmpty &&
        plainText.isEmpty &&
        _selectedBackground == null &&
        !_isPinned) {
      return;
    }

    final repository = ref.read(notesRepositoryProvider);

    if (_isNew) {
      final newNote = Note(
        id: const Uuid().v4(),
        title: title.isNotEmpty ? title : 'Untitled',
        content: content,
        isPinned: _isPinned,
        tagIds: _selectedTagIds,
        background: _selectedBackground,
        updatedAt: DateTime.now(),
        isSynced: false,
      );
      await repository.createNote(newNote);
      if (mounted) {
        setState(() {
          _isNew = false;
          _existingNote = newNote;
        });
      }
    } else if (_existingNote != null) {
      // Check if anything changed
      final tagsChanged = !_listEquals(_existingNote!.tagIds, _selectedTagIds);
      if (_existingNote!.title == title &&
          _existingNote!.content == content &&
          _existingNote!.isPinned == _isPinned &&
          _existingNote!.background == _selectedBackground &&
          !tagsChanged) {
        return;
      }

      final updatedNote = _existingNote!.copyWith(
        title: title,
        content: content,
        isPinned: _isPinned,
        isArchived: _isArchived,
        tagIds: _selectedTagIds,
        background: _selectedBackground,
        updatedAt: DateTime.now(),
        isSynced: false,
      );
      await repository.updateNote(updatedNote);
      if (mounted) {
        setState(() {
          _existingNote = updatedNote;
        });
      }
    }
  }

  bool _listEquals(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    final sortedA = List<String>.from(a)..sort();
    final sortedB = List<String>.from(b)..sort();
    for (int i = 0; i < sortedA.length; i++) {
      if (sortedA[i] != sortedB[i]) return false;
    }
    return true;
  }

  Future<void> _deleteNote() async {
    if (_isNew) {
      context.pop();
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => ConfirmDialog(
        icon: LucideIcons.trash2,
        iconColor: Theme.of(context).colorScheme.error,
        title: 'Delete Note',
        message:
            'This note will be gone forever. Are you sure you want to let it go?',
        cancelText: 'Keep',
        confirmText: 'Delete',
        confirmColor: Theme.of(context).colorScheme.error,
        onConfirm: () {},
      ),
    );

    if (confirm == true && mounted) {
      try {
        await ref.read(notesRepositoryProvider).deleteNote(widget.noteId!);
        _isDeleted = true;

        if (mounted) {
          AppSnackbar.showSuccess(context, message: 'Note moved to trash');
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          AppSnackbar.showError(context, message: 'Failed to delete note');
        }
      }
    }
  }

  Future<void> _restoreNote() async {
    if (_isNew || _existingNote == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => ConfirmDialog(
        icon: LucideIcons.rotateCcw,
        iconColor: Theme.of(context).colorScheme.primary,
        title: 'Restore Note',
        message: 'This note will be restored to your notes.',
        cancelText: 'Cancel',
        confirmText: 'Restore',
        onConfirm: () {},
      ),
    );

    if (confirm != true || !mounted) return;

    try {
      await ref.read(notesRepositoryProvider).restoreNote(widget.noteId!);

      // Reload note to get updated state
      await _loadNote();

      if (mounted) {
        AppSnackbar.showSuccess(context, message: 'Note restored');
      }
    } catch (e) {
      if (mounted) {
        AppSnackbar.showError(context, message: 'Failed to restore note');
      }
    }
  }

  Future<void> _permanentDeleteNote() async {
    if (_isNew || _existingNote == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => ConfirmDialog(
        icon: LucideIcons.trash2,
        iconColor: Theme.of(context).colorScheme.error,
        title: 'Delete Forever',
        message:
            'This action cannot be undone. This note will be permanently deleted and cannot be recovered.',
        cancelText: 'Cancel',
        confirmText: 'Delete Forever',
        confirmColor: Theme.of(context).colorScheme.error,
        onConfirm: () {},
      ),
    );

    if (confirm == true && mounted) {
      try {
        await ref.read(notesRepositoryProvider).permanentDelete(widget.noteId!);
        _isDeleted = true;

        if (mounted) {
          AppSnackbar.showSuccess(context, message: 'Note permanently deleted');
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          AppSnackbar.showError(context, message: 'Failed to delete note');
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isTrashed = _existingNote?.isTrashed ?? false;

    return PopScope(
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop && !_isDeleted && _isEditing) {
          await _saveNote();
        }
      },
      child: NoteBackground(
        styleId: _selectedBackground,
        borderRadius: BorderRadius.zero,
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            leading: IconButton(
              icon: const Icon(LucideIcons.chevronLeft),
              onPressed: () => context.pop(),
            ),
            actions: [
              if (isTrashed) ...[
                // Restore button for trashed notes
                IconButton(
                  icon: const Icon(LucideIcons.rotateCcw),
                  onPressed: _isLoaded && !_isNew ? _restoreNote : null,
                  tooltip: 'Restore Note',
                ),
                // Permanent delete button for trashed notes
                IconButton(
                  icon: const Icon(LucideIcons.trash2),
                  onPressed: _isLoaded && !_isNew ? _permanentDeleteNote : null,
                  tooltip: 'Delete Forever',
                ),
              ] else ...[
                // Normal editing controls for non-trashed notes
                IconButton(
                  icon: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Icon(
                        LucideIcons.pin,
                        color: _isPinned
                            ? theme.colorScheme.primary
                            : theme.colorScheme.onSurface,
                      ),
                      if (_isPinned)
                        Positioned(
                          right: -2,
                          top: -2,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: theme.colorScheme.tertiary,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                  onPressed: _isLoaded && !isTrashed ? _togglePinned : null,
                  tooltip: _isPinned ? 'Unpin Note' : 'Pin Note',
                ),
                IconButton(
                  icon: const Icon(LucideIcons.palette),
                  onPressed: !isTrashed ? _showColorPicker : null,
                  tooltip: 'Change Background',
                ),
                IconButton(
                  icon: Icon(
                    _isArchived
                        ? LucideIcons.archiveRestore
                        : LucideIcons.archive,
                  ),
                  onPressed: _isLoaded && !_isNew && !isTrashed
                      ? _toggleArchived
                      : null,
                  tooltip: _isArchived ? 'Unarchive Note' : 'Archive Note',
                ),
                IconButton(
                  icon: const Icon(LucideIcons.trash2),
                  onPressed: !isTrashed ? _deleteNote : null,
                  tooltip: 'Delete Note',
                ),
              ],
              const SizedBox(width: 8),
            ],
          ),
          floatingActionButton: !_isEditing && !isTrashed
              ? FloatingActionButton(
                  onPressed: _startEditing,
                  tooltip: 'Edit Note',
                  child: const Icon(LucideIcons.pencil),
                )
              : null,
          body: Hero(
            tag: 'note_${widget.noteId ?? 'new'}',
            child: Material(
              color: Colors.transparent,
              child: Column(
                children: [
                  // Read-only banner for trashed notes
                  if (isTrashed)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                      color: theme.colorScheme.surfaceContainerHighest,
                      child: Row(
                        children: [
                          Icon(
                            LucideIcons.lock,
                            size: 16,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'This note is in trash and cannot be edited. Restore it to make changes.',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: TextField(
                      controller: _titleController,
                      readOnly: !_isEditing || isTrashed,
                      style: theme.textTheme.displaySmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.onSurface,
                      ),
                      decoration: InputDecoration(
                        hintText: _isEditing && !isTrashed ? 'Title' : null,
                        hintStyle: TextStyle(
                          color: theme.colorScheme.onSurface.withValues(
                            alpha: 0.3,
                          ),
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          vertical: 16,
                        ),
                        filled: false,
                      ),
                      textCapitalization: TextCapitalization.sentences,
                    ),
                  ),
                  if (_isEditing || _selectedTagIds.isNotEmpty)
                    TagSelector(
                      selectedTagIds: _selectedTagIds,
                      readOnly: !_isEditing || isTrashed,
                      onTagsChanged: (tagIds) {
                        if (!isTrashed) {
                          setState(() {
                            _selectedTagIds = tagIds;
                          });
                        }
                      },
                    ),
                  Expanded(
                    child: _isLoaded
                        ? RichTextEditor(
                            key: _editorKey,
                            initialContent: _initialContent,
                            hintText: 'Start typing...',
                            showToolbar: _isEditing && !isTrashed,
                            readOnly: !_isEditing || isTrashed,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 24,
                              vertical: 16,
                            ),
                          )
                        : const Center(child: CircularProgressIndicator()),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
