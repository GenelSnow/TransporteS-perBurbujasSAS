self.addEventListener("push", (event) => {
  let data = { title: "Facturas TBS Burbujas", body: "Tienes una notificación" }
  try {
    if (event.data) data = event.data.json()
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico",
      data: { url: data.url || "/facturas" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/facturas"
  event.waitUntil(clients.openWindow(url))
})