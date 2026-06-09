"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/lib/types";

function initials(name?: string) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface SearchableUserSelectProps {
  users: User[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  showRole?: boolean;
}

export function SearchableUserSelect({
  users,
  value,
  onChange,
  placeholder = "Select a team member",
  isLoading,
  disabled,
  showRole,
}: SearchableUserSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selected = users.find((u) => String(u.id) === String(value));

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = [u.name, u.email, u.username, u.department]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, query]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground"
          )}
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selected.avatar} alt={selected.name} />
                <AvatarFallback className="text-[10px]">
                  {initials(selected.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selected.name}</span>
              {showRole && selected.role && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {selected.role === "ADMIN" ? "Supervisor" : "Member"}
                </span>
              )}
            </span>
          ) : isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading team…
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, dept…"
            className="h-7 border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {isLoading ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No matches for &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((u) => {
              const isSelected = String(u.id) === String(value);
              return (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => {
                    onChange(String(u.id));
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left",
                    isSelected && "bg-accent/50"
                  )}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={u.avatar} alt={u.name} />
                    <AvatarFallback className="text-[10px]">
                      {initials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm leading-tight">
                      {u.name}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {u.email || u.department || (u.role ?? "")}
                    </div>
                  </div>
                  {showRole && u.role && (
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {u.role === "ADMIN" ? "Sup" : "Mem"}
                    </span>
                  )}
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 text-primary",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
