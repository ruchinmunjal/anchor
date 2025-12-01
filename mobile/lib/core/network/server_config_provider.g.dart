// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'server_config_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$serverUrlHash() => r'58615c09a242bb4d31c991795211b7596bf3cebe';

/// Synchronous provider that returns the current server URL or null.
/// Use this when you need immediate access without async.
///
/// Copied from [serverUrl].
@ProviderFor(serverUrl)
final serverUrlProvider = AutoDisposeProvider<String?>.internal(
  serverUrl,
  name: r'serverUrlProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$serverUrlHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ServerUrlRef = AutoDisposeProviderRef<String?>;
String _$serverConfigHash() => r'ff2eda883c4b963cb2a5d107d18b86d199688cc9';

/// See also [ServerConfig].
@ProviderFor(ServerConfig)
final serverConfigProvider =
    AutoDisposeAsyncNotifierProvider<ServerConfig, String?>.internal(
      ServerConfig.new,
      name: r'serverConfigProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$serverConfigHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

typedef _$ServerConfig = AutoDisposeAsyncNotifier<String?>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
