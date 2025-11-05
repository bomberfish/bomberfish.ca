import {Component, css} from "dreamland/core";
import { Link } from "dreamland/router";
import humanizeDuration from "humanize-duration";

const messages: string[] = [
    "[Praying to RNGesus...]",
    "It's so sad Steve Jobs died of ligma.",
    "Nine parts perspiration.",
    "In memory of Bill Atkinson (1951-2025)",
    "Always use RAID 0 for mission critical data.",
    "Gender is a spectrum, and is therefore regulated by the FCC.",
    "Take care of yourself.",
    "Crank dat Soulja Boy!",
    "The page could not be served due to a temporary server failure.",
    "Y'all mothafuckin' server's down! Get that shit back up, we tryna play!",
    "I hate the JavaScript programming language.",
    "Epstein didn't kill himself.",
    "Bush did 9/11.",
    "I am NOT suicidal, despite what the feds want you to think.",
    "Never kill yourself, that shit kills you.",
    "<ROLAND 169 AHH>",
    "<200-220 bpm amen break>",
    "Just 'cause you feel it, doesn't mean it's there.",
    "Oh, take me back to the start...",
    "All roads lead to Rome.",
    "All toasters toast toast.",
    "Nothing ever happens.",
    "The lion doesn't concern himself with Tailwind.",
    "Tailwind is cancer.",
    "Tailwind is for simpletons.",
    "Tailwind users DNI.",
    "In 1984, I was hospitalized for approaching perfection.",
    "They see me rollin, they hatin'",
    "The lion switches between capitalism and communism depending on his bank account balance.",
    "Play him off, keyboard cat!",
    "Ted Kaczynski had some pretty good ideas.",
    "This device complies with part 15 of the FCC Rules.",
    "Curiosity killed the catboy.",
    "mrrp mrrp mrrow :3",
    "*click click*",
    "200% polyester.",
    "What kind of McDonalds has a message?",
    "Do robots dream of electric sheep?",
    "When life gives you lemons, don't make lemonade.",
    "I don't want your damn lemons, what the hell am I supposed to do with these?",
    "Do you know who I am? I'm the man who's gonna burn your house down!",
    "I'm gonna get my engineers to invent a combustible lemon that burns your house down!",
    "A spectre is haunting Europe.",
    "If you read this you are gay LMAO",
    "Hey, fascist! Catch! [↑ → ↓ ↓ ↓]",
    "Hack the Planet!",
    "The CIA fellas glow in the dark, you can run them over.",
    "Be the reason God stays in His heaven.",
    "I have escaped the sandbox.",
    "there are no bare clients",
    "And for my next trick...",
    "E=mc²+AI",
    "Hot singles in your area!",
    "Government-mandated twink boyfriends near you!",
    "Website vs. Website, Japan",
    "HELVETICA STANDARD",
    "#BringBlackBlackBerry",
    "You can always pirate Adobe products, it's always morally correct.",
    "2010s white boy music > 2000s white girl music. It's the truth.",
    "Scalpers deserve to be scalped.",
    "Did I mention I'm Canadian?",
    "I jugged 12 kids on Halloween.",
    "Praying on my own downfall since 2008.",
    "Get ready to learn Chinese, buddy.",
    "Born just in time to write sarcastic oneliners on the internet.",
    "CERN shifted us into the wrong timeline.",
    "The Irish actually run the world."
]

const Footer: Component<{}, {elapsed: string, message: string, resetSplashInterval?: () => void}> = function (cx) {
    this.elapsed = `built on ${new Date(__BUILD_DATE__).toLocaleDateString()}`;
    this.message = "Your browser really sucks."

    const shuffleSplash = () => {
        const old = this.message;
        let message = old;
        while (message === old) {
            message = messages[Math.floor(Math.random() * messages.length)];
        }
        this.message = message;
    }

    cx.mount = () => {
        this.message = messages[Math.floor(Math.random() * messages.length)];
        const buildDate = new Date(__BUILD_DATE__);
        const updateElapsed = () => {
            const now = new Date();
            const diff = now.getTime() - buildDate.getTime();
            this.elapsed = "built " + humanizeDuration(diff , {round: true}) + " ago";
        };
        updateElapsed();
        const intervalId = setInterval(updateElapsed, 1000);

        let splashIntervalId: number;

        const startSplashInterval = () => {
            // @ts-ignore lgtm
            splashIntervalId = setInterval(() => {
                if (!document.startViewTransition) {
                    shuffleSplash();
                    return;
                }
                document.startViewTransition(shuffleSplash);
            }, 5555);
        };

        const resetSplashInterval = () => {
            clearInterval(splashIntervalId);
            startSplashInterval();
        };

        this.resetSplashInterval = resetSplashInterval;

        startSplashInterval();

        return () => {
            clearInterval(intervalId);
            clearInterval(splashIntervalId);
        };
    }

    return (
        <footer>
            <subt>
                <span class="tooltip-wrapper">
                        <Link href="/siteinfo" class="router-link">
                            {"bomberfish.ca v" + __APP_VERSION__ + " (" + __COMMIT_HASH__ + ")"}
                        </Link>
                    <span class="tooltip">{use(this.elapsed)}</span>
                </span>
                <span class="divider">{" • "}</span>
                <span on:click={()=>{
                    if (!document.startViewTransition) {
                        shuffleSplash();
                    } else {
                        document.startViewTransition(shuffleSplash);
                    }
                    this.resetSplashInterval?.();
                }} class="splash">{use(this.message)}</span>
            </subt>
        </footer>
    );
}

Footer.style = css`
    :scope {
		margin-top: 1.25rem;
		font-size: 0.875rem;
        user-select: none;
	}

    subt {
        display: flex;
        gap: 0.25rem;
    }

    .divider {
        color: var(--subtext1);
        font-weight: 800;
        font-size: 1em;
        margin-inline: 0.15em;
        animation: breathe 2.5s ease-in-out infinite;
    }

    @keyframes breathe {
        0%, 100% {
            color: var(--subtext3);
        }
        50% {
            color: var(--subtext1);
        }
    }

    .splash {
        color: var(--subtext2);
        cursor: pointer;
        flex: 1;
        view-transition-name: splash-message;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`

export default Footer;