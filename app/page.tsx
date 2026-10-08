import Analyst from "@/components/analyst";
import { getAvailableModels } from "@/lib/model";

export const dynamic = "force-dynamic";

export default function Home() {
  return <Analyst models={getAvailableModels()} />;
}
