"use client";

import { useState } from "react";
import { WEEKDAYS, type Holiday } from "@/lib/master/constants";
import { saveHolidaysAndWeeklyOff } from "./actions";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { onEnterKey } from "@/lib/ui/onEnterKey";

export function HolidaysEditor({
  initialHolidays,
  initialWeeklyOff,
}: {
  initialHolidays: Holiday[];
  initialWeeklyOff: number[];
}) {
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [weeklyOff, setWeeklyOff] = useState<number[]>(initialWeeklyOff);
  const [newDate, setNewDate] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const addHoliday = () => {
    if (!newDate || !newLabel) return;
    setHolidays((prev) =>
      [...prev, { date: newDate, label: newLabel }].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );
    setNewDate("");
    setNewLabel("");
  };

  const removeHoliday = (index: number) => {
    setHolidays((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleWeekday = (day: number) => {
    setWeeklyOff((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  return (
    <form action={saveHolidaysAndWeeklyOff}>
      <input type="hidden" name="holidays" value={JSON.stringify(holidays)} readOnly />

      <div className="mb-4">
        <div className="mb-2 text-[12px] font-semibold text-muted">定休日（毎週）</div>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((label, day) => (
            <label key={day} className="flex items-center gap-1.5 text-[13px]">
              <input
                type="checkbox"
                name="weeklyOff"
                value={day}
                checked={weeklyOff.includes(day)}
                onChange={() => toggleWeekday(day)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 text-[12px] font-semibold text-muted">休日カレンダー（祝日・特別休業日）</div>
        <div className="mb-2 flex flex-wrap gap-2">
          {holidays.length === 0 && (
            <span className="text-[13px] text-subtle">登録されている休日はありません</span>
          )}
          {holidays.map((h, i) => (
            <Tag key={`${h.date}-${i}`} onRemove={() => removeHoliday(i)}>
              {h.date} {h.label}
            </Tag>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            onKeyDown={onEnterKey(addHoliday)}
            className="rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
          />
          <input
            type="text"
            placeholder="名称（例: 元日）"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={onEnterKey(addHoliday)}
            className="rounded-control border border-border-strong px-2.5 py-1.5 text-[13px]"
          />
          <Button type="button" onClick={addHoliday}>
            + 追加
          </Button>
        </div>
      </div>

      <Button type="submit" variant="primary">
        保存
      </Button>
    </form>
  );
}
