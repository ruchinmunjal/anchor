import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'server_config_provider.g.dart';

const _serverUrlKey = 'server_url';

@riverpod
class ServerConfig extends _$ServerConfig {
  final _storage = const FlutterSecureStorage();

  @override
  Future<String?> build() async {
    return await _storage.read(key: _serverUrlKey);
  }

  Future<void> setServerUrl(String url) async {
    // Normalize URL: remove trailing slash
    String normalizedUrl = url.trim();
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.substring(0, normalizedUrl.length - 1);
    }

    await _storage.write(key: _serverUrlKey, value: normalizedUrl);
    state = AsyncData(normalizedUrl);
  }

  Future<void> clearServerUrl() async {
    await _storage.delete(key: _serverUrlKey);
    state = const AsyncData(null);
  }
}

/// Synchronous provider that returns the current server URL or null.
/// Use this when you need immediate access without async.
@riverpod
String? serverUrl(Ref ref) {
  final config = ref.watch(serverConfigProvider);
  return config.valueOrNull;
}
