import { useState } from "react";
import { Moon, Sun, Plus, X, Key, Pencil } from "lucide-react";
import { useTheme } from "../_hooks/use-theme";
import { useAppConfigs } from "../_context/app-configs-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Settings() {
    const { theme, setTheme } = useTheme();
    const { configs, add, remove, update } = useAppConfigs();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [label, setLabel] = useState("");
    const [appKey, setAppKey] = useState("");
    const [channel, setChannel] = useState("");
    const [formError, setFormError] = useState("");

    // Separate state for add form
    const [addLabel, setAddLabel] = useState("");
    const [addAppKey, setAddAppKey] = useState("");
    const [addChannel, setAddChannel] = useState("");
    const [addFormError, setAddFormError] = useState("");

    const channelError = channel.trim().length > 0 && (!channel.trim().startsWith("private-") && !channel.trim().startsWith("public-"))
        ? 'Channel must start with "private-" or "public-"'
        : "";

    const addChannelError = addChannel.trim().length > 0 && (!addChannel.trim().startsWith("private-") && !addChannel.trim().startsWith("public-"))
        ? 'Channel must start with "private-" or "public-"'
        : "";

    const startEdit = (cfg: { id: string; label: string; appKey: string; channel: string }) => {
        setEditingId(cfg.id);
        setLabel(cfg.label);
        setAppKey(cfg.appKey);
        setChannel(cfg.channel);
        setFormError("");
        setIsEditDialogOpen(true);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setIsEditDialogOpen(false);
        setLabel("");
        setAppKey("");
        setChannel("");
        setFormError("");
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        if (!appKey.trim()) { setFormError("App Key is required"); return; }
        if (!channel.trim() || (!channel.trim().startsWith("private-") && !channel.trim().startsWith("public-"))) { setFormError('Channel must start with "private-" or "public-"'); return; }
        if (editingId) {
            update(editingId, { label: label.trim() || appKey.trim(), appKey: appKey.trim(), channel: channel.trim() });
            cancelEdit();
        }
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setAddFormError("");
        if (!addAppKey.trim()) { setAddFormError("App Key is required"); return; }
        if (!addChannel.trim() || (!addChannel.trim().startsWith("private-") && !addChannel.trim().startsWith("public-"))) { setAddFormError('Channel must start with "private-" or "public-"'); return; }
        add({ label: addLabel.trim() || addAppKey.trim(), appKey: addAppKey.trim(), channel: addChannel.trim() });
        setAddLabel("");
        setAddAppKey("");
        setAddChannel("");
    };

    return (
        <section className="flex flex-col w-full h-full p-6 overflow-y-auto">
            <h2 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-white">
                Settings
            </h2>

            <div className="flex flex-col gap-4">
                {/* Appearance */}
                <div className="mb-4">
                    <p className="mb-4 text-xs font-semibold tracking-widest uppercase text-zinc-400 dark:text-white/40">
                        Appearance
                    </p>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">Theme</p>
                            <p className="text-xs text-zinc-400 dark:text-white/40">
                                {theme === "dark" ? "Dark mode is active" : "Light mode is active"}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 p-1 rounded-full bg-zinc-200 dark:bg-white/10">
                            <button
                                onClick={() => setTheme("light")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    theme === "light"
                                        ? "bg-white dark:bg-white/20 text-zinc-900 dark:text-white shadow-sm"
                                        : "text-zinc-400 dark:text-white/40 hover:text-zinc-700 dark:hover:text-white/70"
                                }`}
                            >
                                <Sun className="size-3.5" />
                                Light
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    theme === "dark"
                                        ? "bg-zinc-700 dark:bg-white/20 text-white shadow-sm"
                                        : "text-zinc-400 dark:text-white/40 hover:text-zinc-700 dark:hover:text-white/70"
                                }`}
                            >
                                <Moon className="size-3.5" />
                                Dark
                            </button>
                        </div>
                    </div>
                </div>

                {/* App Connections */}
                <div className="pb-4">
                    <p className="mb-4 text-xs font-semibold tracking-widest uppercase text-zinc-400 dark:text-white/40">
                        App Connections
                    </p>

                    {/* Saved configs */}
                    {configs.length > 0 && (
                        <div className="flex flex-col gap-2 mb-4">
                            {configs.map(cfg => (
                                <div key={cfg.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                                    <div className="flex items-center min-w-0 gap-2">
                                        <Key className="size-3.5 shrink-0 text-zinc-400 dark:text-white/30" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate text-zinc-900 dark:text-white">{cfg.label}</p>
                                            <p className="font-mono text-xs truncate text-zinc-400 dark:text-white/40">{cfg.appKey} · {cfg.channel}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(cfg)}
                                            className="transition-colors text-zinc-400 p-2 hover:text-blue-500 dark:text-white/30 dark:hover:text-blue-400"
                                        >
                                            <Pencil className="size-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => remove(cfg.id)}
                                            className="transition-colors text-zinc-400 p-2 hover:text-red-500 dark:text-white/30 dark:hover:text-red-400"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add form */}
                    <form onSubmit={handleAddSubmit} className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs text-zinc-500 dark:text-white/40">Label <span className="opacity-50">(optional)</span></Label>
                                <Input
                                    value={addLabel}
                                    onChange={e => setAddLabel(e.target.value)}
                                    placeholder="My App"
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-zinc-500 dark:text-white/40">App Key <span className="text-red-400">*</span></Label>
                                <Input
                                    value={addAppKey}
                                    onChange={e => setAddAppKey(e.target.value)}
                                    placeholder="your-app-key"
                                    className="h-8 font-mono text-xs"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500 dark:text-white/40">Channel <span className="text-red-400">*</span></Label>
                            <Input
                                value={addChannel}
                                onChange={e => setAddChannel(e.target.value)}
                                placeholder="private-chatbot"
                                className={`h-8 text-xs font-mono ${addChannelError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            />
                            {addChannelError && <p className="text-xs text-red-500">{addChannelError}</p>}
                        </div>
                        {addFormError && <p className="text-xs text-red-500">{addFormError}</p>}
                        <div className="flex items-center gap-2">
                            <Button type="submit" size="sm" className="h-8 gap-1.5">
                                <Plus className="size-3.5" />
                                Add App
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit App Connection</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                        <div className="space-y-1">
                            <Label>Label <span className="text-xs opacity-50">(optional)</span></Label>
                            <Input
                                value={label}
                                onChange={e => setLabel(e.target.value)}
                                placeholder="My App"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>App Key <span className="text-red-400">*</span></Label>
                            <Input
                                value={appKey}
                                onChange={e => setAppKey(e.target.value)}
                                placeholder="your-app-key"
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Channel <span className="text-red-400">*</span></Label>
                            <Input
                                value={channel}
                                onChange={e => setChannel(e.target.value)}
                                placeholder="private-chatbot"
                                className={`font-mono ${channelError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            />
                            {channelError && <p className="text-xs text-red-500">{channelError}</p>}
                        </div>
                        {formError && <p className="text-sm text-red-500">{formError}</p>}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={cancelEdit}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                <Pencil className="size-4 mr-1.5" />
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
