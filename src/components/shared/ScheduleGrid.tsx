import { useTranslation } from "react-i18next";

interface ScheduleGridProps<TState extends string> {
  days: string[];
  slots: string[];
  states: TState[];
  stateColors: Record<TState, string>;
  stateLabels: Record<TState, string>;
  value: Record<string, TState>;
  onChange?: (value: Record<string, TState>) => void;
}

export function ScheduleGrid<TState extends string>({
  days,
  slots,
  states,
  stateColors,
  stateLabels,
  value,
  onChange,
}: ScheduleGridProps<TState>) {
  const { t } = useTranslation("profile");

  function handleClick(day: string, slot: string) {
    if (!onChange) return;
    const key = `${day}_${slot}`;
    const current = value[key] ?? states[states.length - 1];
    const idx = states.indexOf(current);
    const next = states[(idx + 1) % states.length];
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base">
        <thead>
          <tr>
            <th className="p-1 text-left text-gray-400" />
            {days.map((day) => (
              <th key={day} className="p-1 text-center text-gray-400 font-normal">
                {t(day)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot}>
              <td className="p-1 text-gray-400 whitespace-nowrap">
                {t(`${slot}_slot`)}
              </td>
              {days.map((day) => {
                const key = `${day}_${slot}`;
                const state = value[key] ?? states[states.length - 1];
                return (
                  <td key={day} className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleClick(day, slot)}
                      disabled={!onChange}
                      className={`mx-auto h-10 w-10 rounded transition-colors ${stateColors[state]} ${onChange ? "cursor-pointer" : "cursor-default"}`}
                      title={stateLabels[state]}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-3 text-sm text-gray-400">
        {states.map((state) => (
          <span key={state} className="flex items-center gap-1">
            <span className={`inline-block h-4 w-4 rounded ${stateColors[state].split(" ")[0]}`} />
            {stateLabels[state]}
          </span>
        ))}
      </div>
    </div>
  );
}
