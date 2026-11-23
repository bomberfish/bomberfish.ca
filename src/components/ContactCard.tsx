import { Tile } from "../metro-dreamland";
import { ComponentChild, FC } from "dreamland/core";

interface Contact {
	platform: string;
	username: string;
	url: string;
}

// A way to reach me, as a tile: the service's mark up in the corner, its
// name and my handle along the bottom. `color` is one of the tile colour
// classes (c-accent, c-cobalt...), `w` x `h` its size in tile units and
// `pw` x `ph` the same on the home page's phone layout.
// Styles: "Contact tiles" in src/style.css.
function ContactCard(
	this: FC<{
		contact: Contact;
		color?: string;
		w?: number;
		h?: number;
		pw?: number;
		ph?: number;
		children?: ComponentChild;
	}>
) {
	const w = this.w ?? 2;
	const h = this.h ?? 1;
	return (
		<Tile
			href={this.contact.url}
			target="_blank"
			rel="me"
			referrer-policy="unsafe-url"
			color={this.color ?? "c-accent"}
			class="contact-card"
			w={w}
			h={h}
			pw={this.pw ?? w}
			ph={this.ph ?? h}
		>
			<span class="platform-icon">{this.children}</span>
			<span class="contact-text">
				<span class="platform-name">{this.contact.platform}</span>
				<span class="contact-name">{this.contact.username}</span>
			</span>
		</Tile>
	);
}

export default ContactCard;
