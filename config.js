var packageJson = require('./package');
var version = packageJson.version.split(".");

module.exports = {
  api: {
    "name": packageJson.name,
    "description": packageJson.description,
    "version": {
      "major": parseInt(version[0]),
      "minor": parseInt(version[1]),
      "micro": parseInt(version[2])
    },
    "authenticationStrategies": {
      "local": {
        "passwordMinLength": 14
      }
      // "google": {
      //   "url": " ",
      //   "callbackURL": " ",
      //   "clientID": " ",
      //   "clientSecret": " "
      // },
      // "geoaxis": {
      //   "url": 'https://geoaxis.gxaccess.com',
      //   "clientID": '',
      //   "clientSecret": '',
      //   "callbackUrl": '',
      //   "title": "GeoAxis",
      //   "type": "oauth",
      //   "textColor": "FFFFFF",
      //   "buttonColor": "#163043",
      //   "icon": "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAClhJREFUeAHtXA1sFMcVntk7zF+BYDuyzzipGpAalKiqzw4ktY3APvPThJ/+uCgSEKgaIGoiiKKSqopa0tA2rkpaUQRRFLWIQFtiKgSugNo+A0aBpMZ2IgWJtCFKG7DPSk3jxq59PzvTbw4O7szt3u7d2XfGbyXY3Zn33sx8387MmzdzZowuQoAQIAQIAUKAECAECAFCgBAgBAgBQoAQIAQIAUKAECAECAFCgBAgBAgBQoAQIAQIAUKAECAECAFCgBAgBAgBQoAQIAQIgXGKAB+NdpeWbpxwZeLHMx1+lqszNsMpdG00yjUrY3JhTseHJ074zWQykZdWQlwlX/8i1wLlQsqvMckeYlwWSMZy8TwtE40zKpNz9qavo2W1UX4m052pFK6+/Kvyo28wJr4tGQcRQ0VMRFkEG9l2gYwPZkz+wvd82VaxG/VJqofMmr+sWA8ENkoun8TXX5ilbbutWpzxAeZ0zve1/fXibZlZkmCrhxS7l8wJsWBdKBhYyZh0gIwxdaF3bOrOYjIUmA4riG7fvl37oM/xrOB6vZTsK9DJ+KRspd7RMpzzPb4O78vRadn4nHDIcrk9cwWTv2NSPpyNDbBSJwxVf8ubk1t5sb4+YEU+kzKmhBSVeVYKXR6STE7MZCVTKRs9o1fj3N3V3vyvVOyMlq7hHKLI0IWoR0UmjFZl0l8OF/ji1owVMlT7484FN8mQY5kMxkDGju4O78n0Ez1yFm8jpKisuibcM8Y4GWCjcfPKyhdHDrqRsRwzh8yZv2x6f8B/Ed5s8cgUNzpWMW98ovEpmDca/j06JaavlJge0h8K1o15MhgPOBj/zlgkQ9F6s4e43NWViEGdiU5LiXfOQnA33+aSncXMek5jjm6Zo/VOmjTpM+3z/hFbUg7kaaGexsaBlOqeQeUwIVJK7ir1XMR9bjrqAiIOO3O0H115p+kf6bA3nmyE3d6iUk9FOshAaKJVcuc2X3vjO+MJxHS2NUwIArRrUjKK4UljfANczAMp2SFlpj1QW5vDpaxNGgs1V2j8cSIjaQRjFJ3XLvc+ihl2ZkyqjRdMQjt8F7yHbaiERW+EZdx29VKW17jP1968N2U7I2TAKTmvQOAwKfOYM97Pm533C1+HPfXC0upFWHwqEg1DN/Ys2pAW7F1IZy0hGshIehEIb6rObgRV7algV/Ew9lJGnwwbvGVKVEPnSIoQkDEg8h1H7FT8vlLPDGxwNSB6nGtHbzzJIjLNkyIEg9x5Owuw2tpax/8kQvmS3T+eALbbVie+VpddJSWP+eOKHb3Wy9d2YnhcYkdnPMo6ueQCpNhvO+c9VpWw67hRSLHFqvxoyhW6q9YDg4pEZXKmHevqbDqWSG54fjhgG/LvwM7MlOF50e9SYwd97d5T8LLYVfBxX3SmlWcphaV5oLDMs1AIsduKzUzIOCfmHQr5r61GpGKpaflcf6LAXb2mp8N7yFQuKvPeikdn9g8MncTnPs/so+eaVgdX/JRS1TiTtoaeSHkIGs6KPBvd7yldNpsJqTyqrN11vHK+fnAWn70CQ/CbRu0Ip1/3Cg+6SmrWmsrdyCwqXZ7vHxhqARHzTOTRMfhzIOOHERnlZV2NvNi6czZv4cLthq6r6qpBGWjAl5dny24GhNvbXwtuXrHgccyMr5sWL6VDMLGvoMTzXTO5L82vLhBi4DSOSn3VUE5FOBza+u5O7yvRMsrL+iQ6weoziMy/1N9aE09eeVT9gcCf0hGwjGd/JNJw1En0dHqfhDu/09w+PmomXsd2xaZ4csWPVM0aDCDIytgD8fJVGnrjIOfaKt+F5v3DZTgML8U+yInhGdbeeTMaYUiKNRvJSbV+eA175dJjX5u/izqXmOm5SjwvoCe8ZCaDPGCubenpbP5tRE6dbRbc3wJv0nBORqjpP5rDsbzrQtNbEb3oO1fDzqW+1i5Yvzs6w+ozut0T8Zi2qp+sXEFJdSMwifsxmNtMTIjSh/f1NEaBXXgM7xkZ2VRzgBp2rp/qDHkxKtxrJIuu0cU0x5KeC43vG8lop09vD0FQHfdJ6pJC7iosqzKbuJKym2klnI7fjfF8HegImdUFhwh3FrirXgmy0BkzMjAU/p3nTCg3I0OVg/EQ/2naH9Q9qUvKGVLwJuXeJqWfxUo3thS+iTF/yLSakj2LYarISAZktGnalHLf2yc/NpKJpIcJudrWeA6FXook2r5LOV3q4hT89CMFZYsftK2fxQo9HS0NzOFYilHkv8lUE+PdcXm3Y5HVQxdhQuBpYbh0fj+ZAmN0pFzFdP29gpKqg+Gobkzm2H3xtTWdcTqdC0BKt51WYMH3auWcvBV2Yn4xExYmsv1gxtLCJ2HFONdh/D38iuotLhxtXGM9UrBrjhzWx4IafIjUrqAM7oOFcvtWrE3q8ewWPbT4HqHrRzFXmHppShcf+fM4bf/LeHbM0mIXdlMnPsf7A9hBTEN4HIsooO6Gc+iWDL8svPHLKhE+f473MXhNy5n0Wd/ggIpsJCQEHuBauMGHujuP/9NOU8NDVkTBd/bEpwiibY280/0WAqp39A32n0PvWH4r1fgJI82DWJOcL3ZXq9/TWL5iCFFa3Z1Nb2CouRlbsWzpDhZUjooe0s8rkG01U0pXEIcPi8pqLA+ttxGiCvR1ttTBVfuprcLvUOEwmHroLIaghMFUAwjuQrS7EWu1ZQb5MclxCVESvk7vT+AK/ypGepy9wI1/TAi9Cc2+y6jp+HD3YwJvMMpX6RjmpsChOQpyEcA0vwwJUWpYrf4AAfotKhhmbubOy8VCdx2gPIJharJR6xAg3N3d0bwe4ftvgZQ/G8mF07EFoevigKukarOZnCkhSrGn3btL4043SGk3M3Qn5bncVVux0N0HDzHWC41uJNd+5utofkat4VT4vnJ27mpkJ4h4SA3O5t5Cd/W2aFPRzwkJUcJd7Y2X7p++4GF0z5fgYI9NnzW61SbPBW7PDuxp/xoiMWu0aBX0jG09Hc0vRKfV19frT61csBYf7u+j0+M9Ywirc5VU/zxenmGh8YRVmtoFxKJsKwbGDVivTDWSy970+AtD9dPvvcfO7kG74u5zXG8PFwg4PoVh6jWj9gFs7iqr2SOFMB2alD56157u9uanVS+L2LNNSERR7Rf7B/2b0IBn8M8wsBaRz5777YSo8829l3sPYL4wPuOMqK9Dc6zDPsYfrbQFDsFvgEvigx2cH5g7vXJDOOoOw0kTEqmU+nsnXfKjKibFQhyYWASqS03H3ohixu6xhBQsXjyVfarjwJ/x3gqGoSH8LZdaHHD4i51qF5Z6XkZPeT6xDj86rTBntfrrRCkTMrywL5evmNbn76+QQivnTKDn8Hx04zzMP/mQzccwpw52p73c4fUwfr9FSPEjS3JD/uBx9Iz5hvKcfY4g4Qpswp02lDHJKCypfhFt/rGJyPUszrz50/NWJZQjAUKAECAECAFCgBAgBAgBQoAQIAQIAUKAECAECAFCgBAgBAgBQoAQIAQIAUKAECAECAFCgBAgBAgBQoAQIAQIAUJgLCPwf3WTdLB7OGXTAAAAAElFTkSuQmCC"
      // }
      //"login-gov": {
      //  "loa": "1"
      //  "url": "",
      //  "client_id": '',
      //  "acr_values": '',
      //  "redirect_uri": '',
      //  "keyFile": "",
      //  "title": "Login.gov",
      //  "type": "oauth",
      //  "textColor": "FFFFFF",
      //  "buttonColor": "#E21D3E",
      //  "icon": "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",
      //}
    },
    "provision": {
      "strategy": "uid"
    }
  },
  server: {
    "locationServices": {
      // "enabled": true,
      "userCollectionLocationLimit": 100
    }
  }
};
