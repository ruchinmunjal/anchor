import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:google_fonts/google_fonts.dart';

/// A lightweight read-only preview of Quill content for list views.
/// Uses a simple Text widget with plain text extracted from Delta JSON.
class QuillPreview extends StatelessWidget {
  /// The content in JSON Delta format or plain text.
  final String? content;

  /// Maximum lines to show.
  final int maxLines;

  /// Text style for the preview.
  final TextStyle? style;

  const QuillPreview({super.key, this.content, this.maxLines = 6, this.style});

  @override
  Widget build(BuildContext context) {
    if (content == null || content!.isEmpty) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final plainText = _extractPlainText(content!);

    if (plainText.isEmpty) {
      return const SizedBox.shrink();
    }

    return Text(
      plainText,
      style:
          style ??
          GoogleFonts.dmSans(
            fontSize: 14,
            height: 1.5,
            color: theme.textTheme.bodyMedium?.color?.withValues(alpha: 0.8),
          ),
      maxLines: maxLines,
      overflow: TextOverflow.ellipsis,
    );
  }

  /// Extracts plain text from JSON Delta or returns the string as-is.
  String _extractPlainText(String content) {
    try {
      final json = jsonDecode(content);
      if (json is List) {
        final document = Document.fromJson(json);
        return document.toPlainText().trim();
      }
    } catch (_) {
      // Not valid JSON, return as plain text
    }
    return content.trim();
  }
}
