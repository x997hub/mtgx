import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(({ url }) => url.pathname.startsWith("/rest/v1/"), new NetworkFirst({ cacheName: "api-cache" }));
registerRoute(({ request }) => request.destination === "image", new CacheFirst({ cacheName: "image-cache" }));
self.addEventListener("push", (event) => {
    if (!event.data)
        return;
    const data = event.data.json();
    event.waitUntil(self.registration.showNotification(data.title ?? "MTGX", {
        body: data.body ?? "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: data.url ? { url: data.url } : undefined,
    }));
});
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url ?? "/";
    event.waitUntil(self.clients.openWindow(url));
});
