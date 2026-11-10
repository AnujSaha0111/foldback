import robots from "./robots";
import sitemap from "./sitemap";

describe("crawl rules", () => {
  it("keep pay links and plans out of search, and list only public pages", () => {
    expect(robots().rules).toMatchObject({ disallow: ["/pay/", "/plans"] });
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://app.foldback.tech/login");
    expect(urls.some((url) => url.includes("/pay/") || url.includes("/plans"))).toBe(false);
  });
});
