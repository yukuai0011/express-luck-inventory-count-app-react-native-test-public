import { Chip } from 'heroui-native';

export function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Chip variant="soft" color={ok ? 'success' : 'default'} size="sm">
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}
