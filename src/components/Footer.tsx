import {Component, css} from "dreamland/core";
import { Link } from "dreamland/router";
import humanizeDuration from "humanize-duration";

const messages: string[] = [
    "Praying to RNGesus",
    "It's so sad Steve Jobs died of ligma.",
    "Nine parts perspiration",
    "Just 'cause you feel it, doesn't mean it's there",
    "I have escaped the sandbox.",
    "Always use RAID 0 for mission critical data.",
    "Gender is a spectrum and is therefore regulated by the FCC",
    "Take care of yourself.",
    "Crank that (Soulja Boy)",
    "The page could not be served due to a temporary server failure.",
    "i hate the javascript programming language",
    "Epstein didn't kill himself.",
    "Bush did 9/11",
    "ROLAND 169 AHH",
    "Oh, take me back to the start",
    "All roads lead to Rome.",
    "All toasters toast toast.",
    "In memory of Bill Atkinson (1951-2025)",
    "Nothing ever happens.",
    "The lion doesn't concern himself with Tailwind."
]

const Footer: Component<{}, {elapsed: string, message: string}> = function (cx) {
    this.elapsed = `built on ${new Date(__BUILD_DATE__).toLocaleDateString()}`;
    this.message = ""
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

        return () => {
            clearInterval(intervalId);
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
                    const shuffle = () => {
                        const old = this.message;
                        let message = old;
                        while (message === old) {
                            message = messages[Math.floor(Math.random() * messages.length)];
                        }
                        this.message = message;
                    }

                    if (!document.startViewTransition) {
                        shuffle();
                        return;
                    }
                    document.startViewTransition(shuffle);
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
    }

    .splash {
        color: var(--subtext3);
        cursor: pointer;
        flex: 1;
        view-transition-name: splash-message;
    }
`

export default Footer;