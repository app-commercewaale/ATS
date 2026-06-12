"use client";

import { useState, useEffect, useCallback } from "react";
import * as api from "@/lib/api";
import { AppConfig, OfficeLocation } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Loader2, LocateFixed, ShieldCheck, ShieldOff,
  Clock, Plus, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight,
} from "lucide-react";

/* ---- Location editor row (inline add / edit) ---- */
interface LocFormState {
  name: string;
  lat: string;
  lng: string;
  radius_metres: string;
}

const emptyForm = (): LocFormState => ({ name: "", lat: "", lng: "", radius_metres: "50" });

function LocationRow({
  loc,
  onSave,
  onDelete,
  onToggle,
}: {
  loc: OfficeLocation;
  onSave: (id: string, updates: Partial<OfficeLocation>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<LocFormState>({
    name: loc.name,
    lat: String(loc.lat),
    lng: String(loc.lng),
    radius_metres: String(loc.radius_metres),
  });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const { toast } = useToast();

  function captureLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({
          ...f,
          lat: pos.coords.latitude.toFixed(7),
          lng: pos.coords.longitude.toFixed(7),
        }));
        setLocating(false);
        toast({ title: "Location captured" });
      },
      () => {
        setLocating(false);
        toast({ title: "Could not get location", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSave() {
    if (!form.name || !form.lat || !form.lng) return;
    setSaving(true);
    try {
      await onSave(loc.id, {
        name: form.name,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        radius_metres: parseFloat(form.radius_metres) || 50,
      });
      setEditing(false);
      toast({ title: "Location updated" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Head Office" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Latitude</Label>
            <Input value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="19.0760" />
          </div>
          <div className="space-y-1.5">
            <Label>Longitude</Label>
            <Input value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} placeholder="72.8777" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Radius (metres)</Label>
          <Input
            type="number" min="10" max="5000" className="w-32"
            value={form.radius_metres}
            onChange={e => setForm(f => ({ ...f, radius_metres: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={captureLocation} disabled={locating}>
            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
            Use my location
          </Button>
          <Button size="sm" className="gap-1.5 ml-auto" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{loc.name}</span>
          <Badge variant={loc.active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 shrink-0">
            {loc.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} · {loc.radius_metres}m radius
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="icon" variant="ghost" className="h-7 w-7"
          title={loc.active ? "Disable" : "Enable"}
          onClick={() => onToggle(loc.id, !loc.active)}
        >
          {loc.active
            ? <ToggleRight className="h-4 w-4 text-primary" />
            : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(loc.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ---- Add location form ---- */
function AddLocationForm({ onAdd }: { onAdd: (loc: Omit<OfficeLocation, "id">) => Promise<void> }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LocFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  function captureLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({
          ...f,
          lat: pos.coords.latitude.toFixed(7),
          lng: pos.coords.longitude.toFixed(7),
        }));
        setLocating(false);
        toast({ title: "Location captured" });
      },
      () => {
        setLocating(false);
        toast({ title: "Could not get location", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleAdd() {
    if (!form.name || !form.lat || !form.lng) {
      toast({ title: "Name, latitude and longitude are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        name: form.name,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        radius_metres: parseFloat(form.radius_metres) || 50,
        active: true,
      });
      setForm(emptyForm());
      setOpen(false);
      toast({ title: "Location added" });
    } catch {
      toast({ title: "Failed to add location", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Office Location
      </Button>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
      <p className="text-sm font-semibold">New Location</p>
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Branch Office, Pune" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Latitude</Label>
          <Input value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="18.5204" />
        </div>
        <div className="space-y-1.5">
          <Label>Longitude</Label>
          <Input value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} placeholder="73.8567" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Radius (metres)</Label>
        <Input
          type="number" min="10" max="5000" className="w-32"
          value={form.radius_metres}
          onChange={e => setForm(f => ({ ...f, radius_metres: e.target.value }))}
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={captureLocation} disabled={locating}>
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
          Use my location
        </Button>
        <Button size="sm" className="gap-1.5 ml-auto" onClick={handleAdd} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setForm(emptyForm()); }} disabled={saving}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ---- Main settings page ---- */
export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [saving, setSaving] = useState(false);

  // form state
  const [geoEnabled, setGeoEnabled]           = useState(false);
  const [lateThreshold, setLateThreshold]     = useState("12:15");
  const [earlyThreshold, setEarlyThreshold]   = useState("18:30");

  const load = useCallback(async () => {
    const [cfg, locs] = await Promise.all([
      api.getConfig(),
      api.getOfficeLocations().catch(() => [] as OfficeLocation[]),
    ]);
    setConfig(cfg);
    setGeoEnabled(cfg.geofencing_enabled === "true");
    setLateThreshold(cfg.late_threshold || "12:15");
    setEarlyThreshold(cfg.early_threshold || "18:30");
    setLocations(locs);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateConfig({
        geofencing_enabled: geoEnabled ? "true" : "false",
        late_threshold: lateThreshold,
        early_threshold: earlyThreshold,
      });
      toast({ title: "Settings saved" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddLocation(loc: Omit<OfficeLocation, "id">) {
    const newLoc = await api.addOfficeLocation(loc);
    setLocations(prev => [...prev, newLoc]);
  }

  async function handleUpdateLocation(id: string, updates: Partial<OfficeLocation>) {
    await api.updateOfficeLocation(id, updates);
    setLocations(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }

  async function handleDeleteLocation(id: string) {
    await api.deleteOfficeLocation(id);
    setLocations(prev => prev.filter(l => l.id !== id));
    toast({ title: "Location removed" });
  }

  async function handleToggleLocation(id: string, active: boolean) {
    await api.updateOfficeLocation(id, { active });
    setLocations(prev => prev.map(l => l.id === id ? { ...l, active } : l));
  }

  if (!config) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const activeCount = locations.filter(l => l.active).length;

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Configure geofencing zones, office locations, and attendance thresholds.
        </p>
      </div>

      {/* Geofencing toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Geofencing
          </CardTitle>
          <CardDescription>
            When enabled, employees on <strong>Office</strong> mode must be within at least one active location to clock in.
            WFH clock-ins are never restricted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Geofencing</p>
              <p className="text-xs text-muted-foreground">
                {geoEnabled
                  ? `Active — ${activeCount} location${activeCount !== 1 ? "s" : ""} enforced`
                  : "Disabled — employees can clock in from anywhere"}
              </p>
            </div>
            <Button
              variant={geoEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setGeoEnabled(v => !v)}
              className="gap-2 shrink-0"
            >
              {geoEnabled
                ? <><ShieldCheck className="h-4 w-4" /> Enabled</>
                : <><ShieldOff className="h-4 w-4" /> Disabled</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Office Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Office Locations
            {locations.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs font-normal">
                {activeCount} active · {locations.length} total
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Add multiple offices, branches, or sites. An employee passes geofencing if they are within
            <strong> any</strong> active location. Each location has its own radius.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {locations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No locations added yet. Add your first office below.
            </p>
          )}
          {locations.map(loc => (
            <LocationRow
              key={loc.id}
              loc={loc}
              onSave={handleUpdateLocation}
              onDelete={handleDeleteLocation}
              onToggle={handleToggleLocation}
            />
          ))}
          <AddLocationForm onAdd={handleAddLocation} />
        </CardContent>
      </Card>

      {/* Attendance thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Attendance Thresholds
          </CardTitle>
          <CardDescription>
            Clock-ins after the late threshold are flagged as late. Clock-outs before early threshold are flagged as early.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="late-threshold">Late if clocked in after</Label>
            <Input
              id="late-threshold"
              type="time"
              value={lateThreshold}
              onChange={e => setLateThreshold(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="early-threshold">Early leave if clocked out before</Label>
            <Input
              id="early-threshold"
              type="time"
              value={earlyThreshold}
              onChange={e => setEarlyThreshold(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto self-start">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Settings
      </Button>
    </div>
  );
}
