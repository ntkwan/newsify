import { Podcast } from '@/types/podcast';

/**
 * Formats a podcast title by removing the time portion while keeping the date
 * Example: "Newsify Night Update - May 05, 2025 12:00 AM" -> "Newsify Night Update - May 05, 2025"
 *
 * @param title The podcast title to format
 * @returns The formatted title with time removed
 */
export function formatPodcastTitle(title: string): string {
    // Check if the title has the expected format (with date and time)
    const dateTimePattern = /^(.+)(\s-\s.+\d{4})\s\d{1,2}:\d{2}\s[APM]{2}$/;
    const match = title.match(dateTimePattern);

    if (match) {
        // Return the title without the time portion
        return match[1] + match[2];
    }

    // If the pattern doesn't match, return the original title
    return title;
}

/**
 * Gets the podcast length in seconds, handling different data formats
 *
 * @param podcast The podcast object
 * @returns The length in seconds
 */
export function getPodcastLength(podcast: Podcast): number {
    if (!podcast.length_seconds) {
        return 0;
    }

    // If length_seconds is an object with voice-specific values
    if (typeof podcast.length_seconds === 'object') {
        const femaleLength = podcast.length_seconds.female_voice;
        if (typeof femaleLength === 'number') {
            return femaleLength;
        }
    }

    // If length_seconds is directly a number (backward compatibility)
    if (typeof podcast.length_seconds === 'number') {
        return podcast.length_seconds;
    }

    return 0;
}
