import {FC, css} from "dreamland/core";
import { TransitionLink } from "../components/TransitionLink";

function NotFoundView(this: FC) {
    return (
        <main>
            <title>404 – bomberfish.ca</title>
            <div class="layout-container">
                <div class="main-content">
                    <div class="title">
                        <h1 class="material-symbols">broken_image</h1>
                        <h1 class="title-text">Whoops!</h1>
                    </div>
                    <p>The page you're looking for doesn't exist.</p>
                    <div class="go-back">
                    <span>Go back to: </span>
                    <ul class="compact">
                        <li>
                            <TransitionLink href="/" class="nav-link">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z"/></svg>
                                home
                            </TransitionLink>
                        </li>
                        <li>
                            <TransitionLink href="/projects" class="nav-link">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M400-120q-17 0-28.5-11.5T360-160v-480H160q0-83 58.5-141.5T360-840h240v120l120-120h80v320h-80L600-640v480q0 17-11.5 28.5T560-120H400Zm40-80h80v-240h-80v240Zm0-320h80v-240H360q-26 0-49 10.5T271-720h169v200Zm40 40Z"/></svg>
                                projects
                            </TransitionLink>
                        </li>
                        <li>
                            <TransitionLink href="/blog" class="nav-link">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h440l200 200v440q0 33-23.5 56.5T760-120H200Zm0-80h560v-400H600v-160H200v560Zm80-80h400v-80H280v80Zm0-320h200v-80H280v80Zm0 160h400v-80H280v80Zm-80-320v160-160 560-560Z"/></svg>
                                blog
                            </TransitionLink>
                        </li>
                    </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}

NotFoundView.style = css`
    :scope {
        text-align: center;
    }

    .layout-container {
        width: 100%;
        max-width: none;
        max-height: none;
        min-height: 30rem;
        width: 10rem;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: transparent;
        border: none;
    }

    .main-content {
        width: auto;
        max-width: min(100%, 56rem);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .title {
        display: grid;
        place-items: center;
        margin-bottom: 1.75rem;
    }

    .title > * {
        grid-area: 1 / 1;
    }

    .go-back {
        font-size: .95rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }

    .material-symbols {
        font-size: clamp(7rem, 20vw, 10rem);
        color: var(--overlay3);
        margin: 0;
        line-height: 1;
        mask-image: linear-gradient(to bottom, white 0%, transparent 100%);
    }

    .title-text {
        position: relative;
        margin: 0;
        transform: translateY(60%);
        font-size: clamp(2.5rem, 7vw, 5rem);
        line-height: 0.9;
        letter-spacing: -0.04em;
        font-weight: 800;
    }
`

export default NotFoundView;