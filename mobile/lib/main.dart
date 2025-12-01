import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/network/connectivity_provider.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'package:flutter_quill/flutter_quill.dart';

void main() {
  runApp(const ProviderScope(child: AnchorApp()));
}

class AnchorApp extends ConsumerWidget {
  const AnchorApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(goRouterProvider);

    // Initialize sync manager to listen for connectivity changes
    ref.watch(syncManagerProvider);

    return MaterialApp.router(
      title: 'Anchor',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      localizationsDelegates: const [FlutterQuillLocalizations.delegate],
      supportedLocales: const [Locale('en', '')],
    );
  }
}
