import { useState, useRef, type ReactNode } from "react";
import { ImageIcon, VideoIcon, Expand } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

export type BubbleMessage = {
    id?: string;
    type: string;
    payload?: any;
    message?: string;      // pre-extracted text (optional)
    direction: "INBOUND" | "OUTBOUND";
    timestamp: string | number; // ISO string or ms timestamp
    status?: string;
};

function ImageWithPlaceholder({ url }: { url: string }) {
    const [loaded, setLoaded] = useState(false);
    const [lightboxLoaded, setLightboxLoaded] = useState(false);
    const [open, setOpen] = useState(false);

    const handleOpen = (val: boolean) => {
        if (val) setLightboxLoaded(false);
        setOpen(val);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                <div className="block max-w-full">
                    <div className="relative max-w-sm max-h-[400px] cursor-zoom-in">
                        {!loaded && (
                            <div className="flex items-center justify-center w-48 max-w-full rounded bg-zinc-200 h-36 dark:bg-white/10 animate-pulse">
                                <ImageIcon className="text-zinc-400 dark:text-white opacity-30 size-10" />
                            </div>
                        )}
                        <img
                            src={url}
                            alt="Message image"
                            className={`max-w-full rounded max-h-[400px] ${loaded ? "block" : "hidden"}`}
                            onLoad={() => setLoaded(true)}
                        />
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] w-fit bg-black/95 border-none p-2 pt-8">
                <VisuallyHidden.Root>
                    <DialogTitle>Image preview</DialogTitle>
                </VisuallyHidden.Root>
                {!lightboxLoaded && (
                    <div className="flex items-center justify-center w-64 h-48 rounded bg-white/10 animate-pulse">
                        <ImageIcon className="text-white/50 size-12" />
                    </div>
                )}
                <img
                    src={url}
                    alt="Message image"
                    className={`max-w-[85vw] max-h-[85vh] rounded object-contain ${lightboxLoaded ? "block" : "hidden"}`}
                    onLoad={() => setLightboxLoaded(true)}
                />
            </DialogContent>
        </Dialog>
    );
}

function VideoWithPlaceholder({ url }: { url: string }) {
    const [loaded, setLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleFullscreen = () => {
        videoRef.current?.requestFullscreen();
    };

    return (
        <div className="relative max-w-xs">
            {!loaded && (
                <div className="flex items-center justify-center w-48 rounded bg-zinc-200 h-36 dark:bg-white/10 animate-pulse">
                    <VideoIcon className="text-zinc-400 dark:text-white/30 size-10" />
                </div>
            )}
            <div className={`relative ${loaded ? "block" : "hidden"}`}>
                <video
                    ref={videoRef}
                    controls
                    className="max-w-xs rounded max-h-[250px]"
                    onLoadedMetadata={() => setLoaded(true)}
                >
                    <source src={url} />
                    Your browser does not support the video tag.
                </video>
                <button
                    onClick={handleFullscreen}
                    className="absolute flex items-center justify-center transition-colors rounded top-2 right-2 bg-black/60 hover:bg-black/80 size-7"
                    title="Fullscreen"
                >
                    <Expand className="text-white size-4" />
                </button>
            </div>
        </div>
    );
}

function MessageContent({ message, conversationId }: { message: BubbleMessage, conversationId: string }) {
    const payload = message.payload || {};

    switch (message.type) {
        case "lead-context": {
            const context = payload.context ?? {};
            return (
                <table className="text-xs border-collapse min-w-[350px]">
                    <tbody>
                        <tr>
                            <td className="pr-3 py-0.5 text-green-800 dark:text-green-300 whitespace-nowrap font-bold pb-2">
                                <span className="inline-block w-2 h-2 mr-2 bg-green-800 rounded-full animate blink dark:bg-green-300"></span>
                                Lead Details:</td>
                        </tr>
                        {Object.entries(context).map(([k, v]) => (
                            <tr key={k}>
                                <td className="pr-3 py-0.5 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">{k}</td>
                                <td className="py-0.5 text-zinc-800 dark:text-white font-medium">{String(v)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }

        case "image": {
            const imageId = payload.image?.id;
            const imageUrl = imageId
                ? `/api/conversations/media/${imageId}?conversationId=${conversationId}`
                : payload.image?.url || payload.link || payload.url;
            return imageUrl ? <ImageWithPlaceholder url={imageUrl} /> : (
                <p className="text-sm text-zinc-800 dark:text-white">{message.message || "Image"}</p>
            );
        }

        case "video": {
            const videoId = payload.video?.id;
            const videoUrl = videoId
                ? `/api/conversations/media/${videoId}?conversationId=${conversationId}`
                : payload.video?.url || payload.link || payload.url;
            return videoUrl ? <VideoWithPlaceholder url={videoUrl} /> : (
                <p className="text-sm text-zinc-800 dark:text-white">{message.message || "Video"}</p>
            );
        }

        case "audio": {
            const audioId = payload.audio?.id;
            const audioUrl = audioId
                ? `/api/conversations/media/${audioId}?conversationId=${conversationId}`
                : payload.audio?.url || payload.link || payload.url;
            return audioUrl ? (
                <audio controls className="max-w-xs">
                    <source src={audioUrl} />
                    Your browser does not support the audio element.
                </audio>
            ) : (
                <p className="text-sm text-zinc-800 dark:text-white">{message.message || "Audio"}</p>
            );
        }

        case "document": {
            const docUrl =
                payload.document?.link || payload.link || (typeof payload === "object" && "link" in payload ? payload.link : null);
            const docFileName = payload.document?.filename || "Document";
            return docUrl ? (
                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 underline">
                    📄 {docFileName}
                </a>
            ) : (
                <p className="text-sm text-zinc-800 dark:text-white">{message.message || "Document"}</p>
            );
        }

        case "interactive": {
            const userButtonReply = payload.interactive?.button_reply?.title;
            const userListReply = payload.interactive?.list_reply?.title;
            const buttons = payload.action?.buttons ?? [];
            const listItems = payload.action?.sections ?? [];
            const interactiveBody = payload.body?.text || "";

            if (userButtonReply || userListReply) {
                return <p className="text-sm whitespace-pre-wrap text-zinc-800 dark:text-white">{userButtonReply || userListReply}</p>;
            }

            return (
                <div className="flex flex-col gap-2">
                    {interactiveBody && <p className="text-sm whitespace-pre-wrap text-zinc-800 dark:text-white">{interactiveBody}</p>}
                    {buttons.length > 0 && (
                        <div className="flex flex-col gap-1">
                            {buttons.map((btn: any, idx: number) => (
                                <div key={idx} className="px-3 py-2 text-xs font-medium rounded text-zinc-800 bg-zinc-200 dark:text-white dark:bg-black/20">
                                    {btn.reply?.title}
                                </div>
                            ))}
                        </div>
                    )}
                    {listItems.length > 0 && (
                        <div className="flex flex-col gap-1">
                            {listItems.map((section: any, sidx: number) => (
                                <div key={sidx}>
                                    {section.title && <p className="mb-1 text-xs font-semibold text-zinc-800 dark:text-white">{section.title}</p>}
                                    {section.rows?.map((row: any, ridx: number) => (
                                        <div key={`${sidx}-${ridx}`} className="px-3 py-2 mb-1 text-xs text-white bg-blue-600 rounded">
                                            {row.title}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        case "location": {
            const lat = payload.location?.latitude || payload.latitude;
            const lng = payload.location?.longitude || payload.longitude;
            return lat && lng ? (
                <a
                    href={`https://maps.google.com/?q=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 underline"
                >
                    📍 Location: {lat}, {lng}
                </a>
            ) : (
                <p className="text-sm text-zinc-800 dark:text-white">{message.message || "Location"}</p>
            );
        }

        case "sticker": {
            const stickerUrl =
                payload.sticker?.link || payload.link || (typeof payload === "object" && "link" in payload ? payload.link : null);
            return stickerUrl ? (
                <img src={stickerUrl} alt="Sticker" className="max-w-xs rounded" />
            ) : (
                <p className="text-sm text-zinc-800 dark:text-white">{message.message || "Sticker"}</p>
            );
        }

        default: {
            const defaultButtons = payload.action?.buttons ?? [];
            const defaultListItems = payload.action?.sections ?? [];
            const defaultBody = payload.body?.text || "";

            return (
                <div className="flex flex-col gap-2">
                    {(message.message || defaultBody) && (
                        <p className="text-sm whitespace-pre-wrap text-zinc-800 dark:text-white">{message.message || defaultBody}</p>
                    )}
                    {defaultButtons.length > 0 && (
                        <div className="flex flex-col gap-1">
                            {defaultButtons.map((btn: any, idx: number) => (
                                <div key={idx} className="px-3 py-2 text-xs font-medium text-center rounded cursor-not-allowed text-zinc-800 bg-black/10 dark:text-white dark:bg-black/20">
                                    {btn.reply?.title}
                                </div>
                            ))}
                        </div>
                    )}
                    {defaultListItems.length > 0 && (
                        <div className="flex flex-col gap-1">
                            {defaultListItems.map((section: any, sidx: number) => (
                                <div key={sidx}>
                                    {section.title && <p className="mb-1 text-xs font-semibold text-zinc-800 dark:text-white">{section.title}</p>}
                                    {section.rows?.map((row: any, ridx: number) => (
                                        <div key={`${sidx}-${ridx}`} className="px-3 py-2 mb-1 text-xs text-white bg-blue-600 rounded">
                                            {row.title}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
    }
}

function formatTime(timestamp: string | number): string {
    const d = typeof timestamp === "number" ? new Date(timestamp) : new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, conversationId, statusIcon }: { message: BubbleMessage; conversationId: string; statusIcon?: ReactNode }) {
    const isOutbound = message.direction === "OUTBOUND";

    return (
        <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
            <div className={`z-10 overflow-hidden rounded w-full max-w-[90%] bg-white dark:bg-black shadow-sm dark:shadow-none`}>
                <div className={`flex justify-between flex-col items-start px-2 p-1.5 gap-1 ${isOutbound
                    ? "bg-[#d9fdd3] dark:bg-emerald-900"
                    : "bg-white dark:bg-white/20 border border-zinc-100 dark:border-transparent"
                    }`}>
                    <MessageContent message={message} conversationId={conversationId} />
                    <div className={`flex items-end justify-end gap-2 ${isOutbound ? "flex-row ml-auto" : "flex-row-reverse mr-auto"}`}>
                        <p className="text-xs text-zinc-400 dark:text-white/50">{formatTime(message.timestamp)}</p>
                        {statusIcon}
                    </div>
                </div>
            </div>
        </div>
    );
}
