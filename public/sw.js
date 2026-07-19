self.addEventListener("push", function (event) {
  if (!event.data) {
    return;
  }
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/icon-192",
    badge: "/icon-192",
    data: { taskId: data.taskId },
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const taskId = event.notification.data && event.notification.data.taskId;
  const url = taskId ? `/app/tasks/${taskId}` : "/app";
  event.waitUntil(clients.openWindow(url));
});
