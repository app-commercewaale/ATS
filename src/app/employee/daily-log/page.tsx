"use client";

import { useState, useEffect, useCallback } from "react";
import * as api from "@/lib/api";
import { DailyLog } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { PenLine, Trash2, Pencil, Check, X, CalendarDays } from "lucide-react";

export default function DailyLogPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getDailyLogs({ employeeId: user.id });
      setLogs(data);
    } catch {
      toast({ title: "Failed to load logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const todayLog = logs.find(l => l.date === today);

  async function handleSubmit() {
    if (!user || !content.trim()) return;
    setSubmitting(true);
    try {
      await api.addDailyLog(user.id, content.trim());
      setContent("");
      toast({ title: "Work log saved" });
      await fetchLogs();
    } catch {
      toast({ title: "Failed to save log", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(logId: string) {
    if (!editContent.trim()) return;
    try {
      await api.updateDailyLog(logId, editContent.trim());
      setEditingId(null);
      toast({ title: "Log updated" });
      await fetchLogs();
    } catch {
      toast({ title: "Failed to update log", variant: "destructive" });
    }
  }

  async function handleDelete(logId: string) {
    try {
      await api.deleteDailyLog(logId);
      toast({ title: "Log deleted" });
      await fetchLogs();
    } catch {
      toast({ title: "Failed to delete log", variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Daily Work Log</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Write what you worked on today. Your entries are visible to your admin.
        </p>
      </div>

      {/* Today's entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PenLine className="h-4 w-4" />
            Today — {format(new Date(), "EEEE, d MMMM yyyy")}
          </CardTitle>
          {todayLog && (
            <CardDescription className="text-xs text-amber-600 dark:text-amber-400">
              You already have an entry for today. You can add another or edit the existing one below.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="What did you work on today? Summarise your progress, tasks completed, blockers, etc."
            className="min-h-[120px] resize-none"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "Saving…" : "Save Log"}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Your Log History</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No log entries yet. Write your first one above.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <Card key={log.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {format(parseISO(log.date), "EEEE, d MMM yyyy")}
                      </span>
                      {log.date === today && (
                        <Badge variant="default" className="text-[10px]">Today</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {editingId === log.id ? (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => handleUpdate(log.id)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(log.id); setEditContent(log.content); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(log.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(log.created_at.replace(" ", "T")), "h:mm a")}
                  </span>
                </CardHeader>
                <CardContent>
                  {editingId === log.id ? (
                    <Textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="min-h-[80px] resize-none text-sm"
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{log.content}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
