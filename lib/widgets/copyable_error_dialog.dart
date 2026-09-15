import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// 可复制的报错弹窗。
/// 报错原文必须能选中、能一键复制、关掉之后还能从操作记录里找回，
/// 不能只给一个错误代码或一闪而过的提示。
Future<void> showCopyableError(
    BuildContext context, String title, String detail) {
  return showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(title, style: const TextStyle(fontSize: 16)),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: SelectableText(
          detail,
          style: const TextStyle(fontSize: 13, fontFamily: 'monospace'),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('关闭'),
        ),
        TextButton.icon(
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: detail));
            if (ctx.mounted) Navigator.pop(ctx);
          },
          icon: const Icon(Icons.copy, size: 16),
          label: const Text('复制'),
        ),
      ],
    ),
  );
}
