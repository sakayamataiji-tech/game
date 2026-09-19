import { Trainer } from "@/components/Trainer";
import { Mode, MODES } from "@/engine/scenarioGenerator";
import { MODE_INFO } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return MODES.map((mode) => ({ mode }));
}

export async function generateMetadata({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  const info = MODE_INFO[mode as Mode];
  return { title: `${info.title} – NLH Dealer Trainer` };
}

export default async function TrainPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  return <Trainer mode={mode as Mode} />;
}
