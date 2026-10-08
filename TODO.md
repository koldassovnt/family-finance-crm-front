# TODO

- **Reach the app by a local hostname instead of the server's IP.** Today the
  only way in from another device is typing the Windows PC's LAN address, which
  nobody remembers and which changes if the router hands out a new lease.
  Options to weigh: a DNS record or static hostname on the router, mDNS
  (`something.local`), or at minimum a DHCP reservation so the IP stops moving.
