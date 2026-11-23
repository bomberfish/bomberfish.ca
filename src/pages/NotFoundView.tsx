import { FC } from "dreamland/core";
import { Button, Page, PageHeader, Tile } from "../metro-dreamland";
import SiteNav from "../components/SiteNav";

// Styles: "404" in src/style.css.
function NotFoundView(this: FC) {
	return (
		<Page kind="page">
			<title>404 – bomberfish.ca</title>
			<div class="layout-container">
				<SiteNav />
				<div class="main-content not-found">
					<PageHeader data-m-feather>
						<Tile
							as="p"
							color="accent"
							class="frown"
							aria-hidden="true"
							feather={false}
						>
							:(
						</Tile>
						<h1 class="post-title title-text">Whoops!</h1>
						<p>The page you're looking for doesn't exist.</p>
					</PageHeader>
					<div class="go-back" data-m-feather>
						<span>Go back to: </span>
						<Button to="/" data-m-up>
							<span class="material-symbols">home</span>
							home
						</Button>
						<Button to="/projects">
							<span class="material-symbols">construction</span>
							projects
						</Button>
						<Button to="/blog">
							<span class="material-symbols">article</span>
							blog
						</Button>
					</div>
				</div>
			</div>
		</Page>
	);
}

export default NotFoundView;
