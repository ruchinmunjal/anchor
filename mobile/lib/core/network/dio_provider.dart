import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'server_config_provider.dart';

part 'dio_provider.g.dart';

@riverpod
Dio dio(Ref ref) {
  final serverUrl = ref.watch(serverUrlProvider);
  final dio = Dio();

  // Set base URL from server config
  if (serverUrl != null && serverUrl.isNotEmpty) {
    dio.options.baseUrl = serverUrl;
  }

  dio.options.connectTimeout = const Duration(seconds: 10);
  dio.options.receiveTimeout = const Duration(seconds: 10);
  dio.options.headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add Authorization Interceptor
  const storage = FlutterSecureStorage();
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        // Handle 401 Unauthorized - maybe redirect to login or refresh token
        if (e.response?.statusCode == 401) {
          // For now just pass it through, UI can handle logout
        }
        return handler.next(e);
      },
    ),
  );

  // Add logging interceptor in debug mode
  if (kDebugMode) {
    dio.interceptors.add(LogInterceptor(requestBody: true, responseBody: true));
  }

  return dio;
}
