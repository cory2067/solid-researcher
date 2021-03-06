# solid-researcher

CLI for researchers on the solid-aggregator platform. Uses [seal.js](https://github.com/cory2067/seal.js), a JavaScript wrapper of Microsoft's [SEAL](http://sealcrypto.org) homomorphic encryption library.

## setup
Configure the constant `AGG_URI` in `index.js` to point to the desired [solid-aggregator](https://github.com/cory2067/solid-aggregator). 
Don't forget to run `npm install`

## supported functionality
### generate a keypair
```
node . --keygen
```

This generates two files `public.key` and `secret.key` for this researcher. The public
key must be hosted somewhere publically accessible.  This keypair is generated by SEAL, so
it supports fully homomorphic encryption.

### submit a study
```
node . --keygen FILE
```

Submit a study (a JSON file) to the aggregator. It may be more convenient to do this via the frontend interface of [solid-aggregator](https://github.com/cory2067/solid-aggregator). 
Refer to the solid-aggregator documentation for how to format the JSON properly.

### compute an aggregate
```
node .
```

The CLI will prompt you for the WebID you used to submit this study.
It will list all current studies you have open, and prompt you to pick one
to aggregate. (Type the corresponding number of the desired study). The interface should
automatically compute the the aggregation result, by decrypting using `private.key`.
