import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import {
  estimateHtmlBodyHeight,
  wrapEmailHtmlDocument,
} from '@/features/threads/models/html-sanitize';
import { AppText } from '@/shared/components/AppText';
import { borderTokens, radiusTokens, spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type MessageBodyProps = {
  bodyHtml?: string;
  bodyText?: string;
  testID?: string;
};

/**
 * Renders untrusted email HTML in a locked-down WebView:
 * - JavaScript disabled
 * - External navigation blocked
 * - Basic tag/handler stripping before load
 *
 * Trade-off: fidelity of complex email CSS is better than native HTML renderers,
 * but we intentionally disable JS and block navigations, so interactive tracking
 * pixels/scripts and link opens do not run inside the viewer.
 */
export function MessageBody({ bodyHtml, bodyText, testID }: MessageBodyProps) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  const htmlSource = useMemo(() => {
    if (!bodyHtml || bodyHtml.trim().length === 0) {
      return null;
    }
    return {
      html: wrapEmailHtmlDocument(bodyHtml, colors.textPrimary, colors.surface),
    };
  }, [bodyHtml, colors.surface, colors.textPrimary]);

  if (failed || !htmlSource) {
    const fallback = bodyText?.trim() || stripTags(bodyHtml ?? '') || 'No message body.';
    return (
      <AppText testID={testID} variant="body" style={styles.plaintext}>
        {fallback}
      </AppText>
    );
  }

  const height = estimateHtmlBodyHeight(htmlSource.html.length);

  return (
    <View
      testID={testID}
      style={[
        styles.webviewWrap,
        {
          height,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <WebView
        originWhitelist={['about:blank', 'about:srcdoc']}
        source={htmlSource}
        style={styles.webview}
        scrollEnabled
        nestedScrollEnabled
        javaScriptEnabled={false}
        domStorageEnabled={false}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        setSupportMultipleWindows={false}
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        onShouldStartLoadWithRequest={(request) => {
          // Allow the initial inline document; block navigations/clicks to external URLs.
          if (
            request.navigationType === 'click' ||
            request.url.startsWith('http:') ||
            request.url.startsWith('https:') ||
            request.url.startsWith('mailto:')
          ) {
            return false;
          }
          return true;
        }}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
      />
    </View>
  );
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const styles = StyleSheet.create({
  plaintext: {
    marginTop: spacingTokens.xs,
  },
  webviewWrap: {
    marginTop: spacingTokens.sm,
    borderWidth: borderTokens.width,
    borderRadius: radiusTokens.md,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
