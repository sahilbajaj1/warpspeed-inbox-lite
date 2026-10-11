import { useLocalSearchParams } from 'expo-router';

import { ThreadDetailScreen } from '@/features/threads/screens/ThreadDetailScreen';
import { AppScreen } from '@/shared/components/AppScreen';
import { AppText } from '@/shared/components/AppText';

export default function ThreadRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (typeof id !== 'string' || id.length === 0) {
    return (
      <AppScreen>
        <AppText tone="error">Missing thread id.</AppText>
      </AppScreen>
    );
  }

  return <ThreadDetailScreen threadId={id} />;
}
