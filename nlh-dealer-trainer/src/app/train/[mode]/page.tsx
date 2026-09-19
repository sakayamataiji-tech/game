import { Trainer } from "@/components/Trainer";
import { MODES } from "@/engine/scenarioGenerator";
import { MODE_INFO } from "@/lib/format";
import type { TrainMode } from "@/lib/session";

export const dynamicParams = false;

const TRAIN_MODES: TrainMode[] = [...MODES, "quick"];

export function generateStaticParams() {
  return TRAIN_MODES.map((mode) => ({ mode }));
}

export async function generateMetadata({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  const info = MODE_INFO[mode as TrainMode];
  return { title: `${info.title} – NLH Dealer Trainer` };
}

export default async function TrainPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  return <Trainer train={mode as TrainMode} />;
}
