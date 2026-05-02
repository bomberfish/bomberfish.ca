import { ComponentChild, FC, css } from "dreamland/core";

interface Contact {
  platform: string;
  username: string;
  url?: string | null;
  note?: string | null;
}

function ContactCard(this: FC<{ contact: Contact, children?: ComponentChild}>) {
    return (
        this.contact.url ? (
            <a href={this.contact.url} target="_blank" rel="me" referrer-policy="unsafe-url" class="contact-card card">
                <p class="contact-platform">
                    <span class="platform-icon">{this.children}</span>
                    <span class="platform-name">{this.contact.platform}</span>
                </p>
                <p class="contact-name">{this.contact.username}</p>
                {this.contact.note && <hr /> }
                {this.contact.note && <p class="contact-note">{this.contact.note}</p>}
            </a>
        ) : (
            <div class="contact-card card">
                <p class="contact-platform">
                    <span class="platform-icon">{this.children}</span>
                    <span class="platform-name">{this.contact.platform}</span>
                </p>
                <p class="contact-name">{this.contact.username}</p>
                {this.contact.note && <hr /> }
                {this.contact.note && <p class="contact-note">{this.contact.note}</p>}
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
        background-color: var(--base);
        border: 1px solid var(--surface2);
        max-width: 300px;
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
        gap: 0;
    }
    
    .platform-icon svg {
        color: var(--supertext);
        margin-right: 0.5rem;
    }

    .platform-name {
        font-family: var(--font-display);
        font-weight: 450;
        color: var(--supertext);
        font-size: 1.15rem;
    }

    .contact-name {
        font-family: var(--font-body);
        color: var(--text1);
        font-weight: 400;
        font-size: 0.95rem;
    }

    .contact-note {
        font-family: var(--font-serif);
        font-weight: 400;
        font-size: 0.8rem;
        color: var(--subtext2);
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
    }
`

export default ContactCard;