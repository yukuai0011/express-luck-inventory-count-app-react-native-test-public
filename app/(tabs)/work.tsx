import { ScrollView } from "react-native";
import { WorkCard } from "@/components/work-card";

export default function WorkTab() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4 pb-8"
    >
      <WorkCard />
    </ScrollView>
  );
}
