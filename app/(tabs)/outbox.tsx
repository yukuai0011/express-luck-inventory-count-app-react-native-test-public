import { ScrollView } from "react-native";
import { OutboxCard } from "@/components/outbox-card";

export default function OutboxTab() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4 pb-8"
    >
      <OutboxCard />
    </ScrollView>
  );
}
