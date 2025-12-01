import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/notes/presentation/notes_list_screen.dart';
import '../../features/notes/presentation/note_edit_screen.dart';
import '../../features/notes/presentation/trash_screen.dart';
import '../presentation/splash_screen.dart';
import '../presentation/server_config_screen.dart';
import '../network/server_config_provider.dart';

part 'app_router.g.dart';

@riverpod
GoRouter goRouter(Ref ref) {
  final authState = ref.watch(authControllerProvider);
  final serverConfig = ref.watch(serverConfigProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final currentPath = state.matchedLocation;

      // While loading server config, stay on splash
      if (serverConfig.isLoading) {
        return '/splash';
      }

      // Check if server is configured
      final hasServerUrl = serverConfig.valueOrNull != null &&
          serverConfig.valueOrNull!.isNotEmpty;

      // Server config screen
      if (currentPath == '/server-config') {
        // If server is already configured, go to splash to check auth
        if (hasServerUrl) {
          return '/splash';
        }
        return null;
      }

      // If no server URL, redirect to server config
      if (!hasServerUrl) {
        return '/server-config';
      }

      // Now handle auth flow
      if (authState.isLoading) {
        return '/splash';
      }

      final isLoggedIn = authState.valueOrNull != null;
      final isLoggingIn = currentPath == '/login';
      final isRegistering = currentPath == '/register';
      final isSplash = currentPath == '/splash';

      if (isSplash) {
        return isLoggedIn ? '/' : '/login';
      }

      if (!isLoggedIn && !isLoggingIn && !isRegistering) {
        return '/login';
      }

      if (isLoggedIn && (isLoggingIn || isRegistering)) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/server-config',
        builder: (context, state) => const ServerConfigScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const NotesListScreen(),
        routes: [
          GoRoute(
            path: 'note/new',
            builder: (context, state) => const NoteEditScreen(),
          ),
          GoRoute(
            path: 'note/:id',
            builder: (context, state) {
              final id = state.pathParameters['id'];
              return NoteEditScreen(noteId: id);
            },
          ),
          GoRoute(
            path: 'trash',
            builder: (context, state) => const TrashScreen(),
          ),
        ],
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
    ],
  );
}
