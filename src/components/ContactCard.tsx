import { ComponentChild, FC, css } from "dreamland/core";

interface Contact {
    platform: string;
    username: string;
    url?: string | null;
    note?: string | null;
}

function ContactCard(this: FC<{ contact: Contact, compact?: boolean, children?: ComponentChild }>) {
    if (this.compact) {
        return (
            this.contact.url ? (
                <a href={this.contact.url} target="_blank" rel="me" referrer-policy="unsafe-url" class="contact-card card compact">
                    <span class="platform-icon">{this.children}</span>
                    <span class="contact-text">
                        <span class="platform-name">{this.contact.platform}</span>
                        <span class="contact-name">{this.contact.username}</span>
                    </span>
                </a>
            ) : (
                <div class="contact-card card compact">
                    <span class="platform-icon">{this.children}</span>
                    <span class="contact-text">
                        <span class="platform-name">{this.contact.platform}</span>
                        <span class="contact-name">{this.contact.username}</span>
                    </span>
                </div>
            )
        );
    }
    return (
        this.contact.url ? (
            <a href={this.contact.url} target="_blank" rel="me" referrer-policy="unsafe-url" class="contact-card card">
                <p class="contact-platform">
                    <span class="platform-icon">{this.children}</span>
                    <span class="platform-name">{this.contact.platform}</span>
                </p>
                <p class="contact-name">{this.contact.username}</p>
            </a>
        ) : (
            <div class="contact-card card">
                <p class="contact-platform">
                    <span class="platform-icon">{this.children}</span>
                    <span class="platform-name">{this.contact.platform}</span>
                </p>
                <p class="contact-name">{this.contact.username}</p>
            </div>
        )
    );
}

ContactCard.style = css`
    :scope {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        text-decoration: none;
        padding: 1rem;
        background-color: hsla(var(--crust-hsl), .7);
        border: 1px solid var(--surface2);
        width: 100%;
        min-width: 0;
        min-height: 100%;
        box-sizing: border-box;
		transform: scale(1) translateY(0);
		transition:
			transform 0.2s,
			border-color 0.2s;
    }

    :scope:is(a):hover {
        border-color: var(--overlay0);
        transform: scale(1.02) translateY(-2px);
    }

    p {
        margin: 0!important;
    }

    .contact-platform {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .platform-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    
    .platform-icon svg {
        color: var(--supertext);
        margin-right: 0.5rem;
    }

    .platform-name {
        font-family: var(--font-display);
        color: var(--supertext);
        font-size: 1.15rem;
    }

    .contact-name {
        font-family: var(--font-body);
        color: var(--text1);
        font-weight: 400;
        font-size: 0.95rem;
        overflow-wrap: anywhere;
    }

    .contact-note {
        font-family: var(--font-display);
        font-weight: 400;
        font-size: 0.8rem;
        color: var(--subtext2);
        margin-top: 0!important;
        text-wrap: pretty;
    }

    :scope::after {
        display: none;
        content: "";
    }

    hr {
        width: 100%;
        height: 1px;
        background-color: var(--surface1);
        color: transparent;
        border: none;
        flex-shrink: 0;
        margin: 0.5em 0;
    }

    :scope.compact {
        flex-direction: row;
        align-items: center;
        gap: 0.65rem;
        padding: 0.55rem 0.75rem;
        min-height: 0;
    }

    :scope.compact .platform-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.05rem;
        color: var(--supertext);
        flex-shrink: 0;
    }

    :scope.compact .platform-icon svg {
        margin-right: 0;
    }

    :scope.compact .contact-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 0.05rem;
        line-height: 1.2;
    }

    :scope.compact .platform-name {
        font-family: var(--font-display);
        color: var(--supertext);
        font-size: 0.95rem;
    }

    :scope.compact .contact-name {
        font-family: var(--font-body);
        color: var(--text1);
        font-size: 0.78rem;
        font-weight: 400;
        overflow-wrap: anywhere;
    }
`

export default ContactCard;
