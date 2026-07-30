/**
 * Generate a consistent dark color hex value based on a string (name/phone)
 * Same input always returns the same color
 */
export function getColorFromString(str: string): string {
    const darkColors = [
        "#3f3f46", // zinc-700
        "#404040", // gray-700
        "#3f4551", // slate-700
        "#5a4637", // stone-700
        "#b45309", // amber-800
        "#854d0e", // yellow-800
        "#92400e", // orange-800
        "#991b1b", // red-800
        "#831843", // rose-800
        "#831843", // pink-800
        "#6b21a8", // fuchsia-800
        "#6b21a8", // purple-800
        "#4c1d95", // violet-800
        "#3730a3", // indigo-800
        "#1e3a8a", // blue-800
        "#0e4e94", // cyan-800
        "#134e4a", // teal-800
        "#065f46", // emerald-800
        "#166534", // green-800
        "#4d7c0f", // lime-800
    ];

    // Simple hash function: sum of character codes
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash += str.charCodeAt(i);
    }

    // Map hash to color index
    const colorIndex = hash % darkColors.length;
    return darkColors[colorIndex];
}
