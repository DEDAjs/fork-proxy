# List of Helpful Tools and Commands


# Generate a self-signed certificate

```bash
openssl genrsa -des3 -passout pass:x -out keypair.key 2048
openssl rsa -passin pass:x -in keypair.key -out private.key
openssl req -new -key private.key -out cert.csr
openssl x509 -req -days 3650 -in cert.csr -signkey private.key -out cert.crt
```