import { Card, Text } from 'heroui-native';
import { Platform, ScrollView } from 'react-native';

export function ResultCard({ children }: { children: string }) {
  return (
    <Card variant="flat" className="border border-separator">
      <Card.Body className="p-3">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <Text
            style={{
              fontFamily: Platform.select({
                ios: 'Menlo',
                android: 'monospace',
                default: 'monospace',
              }),
              fontSize: 12,
            }}
          >
            {children}
          </Text>
        </ScrollView>
      </Card.Body>
    </Card>
  );
}
