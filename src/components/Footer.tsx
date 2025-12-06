import {Component, css} from "dreamland/core";
import humanizeDuration from "humanize-duration";
import TransitionLink from "./TransitionLink";

type DocumentWithViewTransition = Document & {
    startViewTransition?: (callback: () => void | Promise<void>) => ViewTransition;
};

const messages: string[] = [
    "[Praying to RNGesus...]",
    "Nine parts perspiration.",
    "In memory of Bill Atkinson (1951-2025)",
    "Take care of yourself.",
    "In 1984, I was hospitalized for approaching perfection.",
    "They see me rollin, they hatin'",
    "This device complies with part 15 of the FCC Rules.",
    "Curiosity killed the catboy.",
    "200% polyester.",
    "Hack the Planet!",
    "Copy that floppy!",
    "And the universe said I love you, because you are love.",
    "Always try to be nice, but never fail to be kind."
]

const Footer: Component<{}, {elapsed: string, message: string, resetSplashInterval?: () => void}> = function (cx) {
    this.elapsed = `built on ${new Date(__BUILD_DATE__).toLocaleDateString()}`;
    this.message = "Your browser really sucks."

    const runSplashTransition = (update: () => void) => {
        if (typeof document === "undefined") {
            update();
            return;
        }
        const doc = document as DocumentWithViewTransition;
        if (typeof doc.startViewTransition !== "function") {
            update();
            return;
        }
        const root = document.documentElement;
        root.dataset.vtScope = "splash";
        try {
            const transition = doc.startViewTransition(() => {
                update();
            });
            transition.finished.finally(() => {
                if (root.dataset.vtScope === "splash") {
                    delete root.dataset.vtScope;
                }
            });
        } catch (error) {
            delete root.dataset.vtScope;
            update();
            return;
        }
    };

    const pickNewSplashMessage = () => {
        const old = this.message;
        let message = old;
        while (message === old) {
            message = messages[Math.floor(Math.random() * messages.length)];
        }
        this.message = message;
    };

    const shuffleSplash = () => {
        runSplashTransition(pickNewSplashMessage);
    };

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

        // let splashIntervalId: number;

        // const startSplashInterval = () => {
        //     // @ts-ignore lgtm
        //     splashIntervalId = setInterval(() => {
        //         shuffleSplash();
        //     }, 5555);
        // };

        // const resetSplashInterval = () => {
        //     clearInterval(splashIntervalId);
        //     startSplashInterval();
        // };

        // this.resetSplashInterval = resetSplashInterval;

        // startSplashInterval();

        return () => {
            clearInterval(intervalId);
            // clearInterval(splashIntervalId);
        };
    }

    return (
        <footer>
            <subt>
                <span class="tooltip-wrapper">
                        <TransitionLink href="/siteinfo" class="router-link">
                            {"bomberfish.ca v" + __APP_VERSION__ + " (" + __COMMIT_HASH__ + ")"}
                        </TransitionLink>
                    <span class="tooltip">{use(this.elapsed)}</span>
                </span>
                <span class="divider">{" • "}</span>
                <span on:click={()=>{
                    shuffleSplash();
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