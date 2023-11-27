import https from 'https';
import FormData from 'form-data';

/**
 * Makes Http calls on specified urls.
 */
export class HttpClient {

    /**
     * Used to log to the console.
     */
    private _console: Console;

    /**
     * The access token
     */
    private _token?: string

    /**
     * Constructor.
     * @param console Used to log to the console.
     * @param token The access token.
     */
    constructor(console: Console, token?: string) {
        this._console = console
        this._token = token
    }

    /**
     * Sends a post request to the specified url with the specified data.
     * @param url The url to send a post request to.
     * @param formData The data to put in the post.
     */
    sendPost(url: string, formData: string) {
        const console = this._console
        this.sendPostHandleResponse(url, formData, function (chunk) {
            console.log('Response: ' + chunk);
        })
    }

    /**
     * Sends a post request to the specified url with the specified data.
     * @param url The url to send a post request to.
     * @param formData The data to put in the post.
     * @param response The post response handler function.
     */
    sendPostHandleResponse(url: string, formData: string, response: (chunk: any) => void) {
        const aUrl = new URL(url);

        formData += this.tokenParam()
        formData += this.jsonFormatParam()

        var post_options = {
            host: aUrl.host,
            port: aUrl.port,
            path: aUrl.pathname,
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'content-length': Buffer.byteLength(formData),
                'accept': 'application/json'
            }
        };

        // Set up the request
        var post_req = https.request(post_options, function (res) {
            res.setEncoding('utf8');
            res.on('data', response);
        });

        // post the data
        post_req.write(formData);
        post_req.end();
    }

    /**
     * Sends a post request to the specified url with the specified data.
     * @param url The url to send a post request to.
     * @param form The data to put in the post.
     */
    sendPostForm(url: string, form: FormData) {
        const console = this._console
        this.sendPostFormHandleResponse(url, form, function (chunk) {
            console.log('Response: ' + chunk)
        })
    }

    /**
     * Sends a post request to the specified url with the specified data.
     * @param url The url to send a post request to.
     * @param form The data to put in the post.
     * @param response The post response handler function.
     */
    sendPostFormHandleResponse(url: string, form: FormData, response: (chunk: any) => void) {
        const aUrl = new URL(url)

        if (this._token != null) {
            form.append('token', this._token)
        }
        form.append('f', 'json')

        var post_options = {
            host: aUrl.host,
            port: aUrl.port,
            path: aUrl.pathname,
            method: 'POST',
            headers: form.getHeaders()
        };

        // Set up the request
        var post_req = https.request(post_options, function (res) {
            res.setEncoding('utf8')
            res.on('data', response)
        });

        // post the data
        form.pipe(post_req)
    }

    /**
     * Sends a get request to the specified url.
     * @param url The url of the get request.
     */
    sendGet(url: string) {
        const console = this._console
        this.sendGetHandleResponse(url, function (chunk) {
            console.log('Response: ' + chunk);
        })
    }

    /**
     * Sends a get request to the specified url.
     * @param url The url of the get request.
     * @param response The get response handler function.
     */
    sendGetHandleResponse(url: string, response: (chunk: any) => void) {

        url += this.tokenParam(url)
        url += this.jsonFormatParam(url)

        try {
            const aUrl = new URL(url)

            var options = {
                host: aUrl.host,
                port: aUrl.port,
                path: aUrl.pathname + '?' + aUrl.searchParams,
                method: 'GET',
                headers: {
                    'accept': 'application/json'
                }
            };

            // Set up the request
            var get_req = https.request(options, function (res) {
                let data = '';
                res.setEncoding('utf8');
                res.on('data', (chunk: string): void => {data += chunk;});
                res.on('end', (): void =>{response(data);});
            });

            get_req.on('error', function(error) {
                console.log('Error for ' + url + ' ' + error);
            });

            // get the data
            get_req.end();
        } catch (e) {
            if (e instanceof TypeError) {
                console.log('Error for ' + url + ' ' + e)
                response('{}')
            } else {
                throw e;//cause we dont know what it is or we want to only handle TypeError
            }
        }
    }

    /**
     * Get the token parameter
     * @param url URL the parameter will be added to
     * @returns token param
     */
    private tokenParam(url?: string): string {
        let token = ''
        if (this._token != null) {
            token += this.paramSeparator(url)
            token += "token=" + this._token
        }
        return token
    }

    /**
     * Get the JSON format parameter
     * @param url URL the parameter will be added to
     * @returns json format parameter
     */
    private jsonFormatParam(url?: string): string {
        return this.paramSeparator(url) + "f=json"
    }

    /**
     * Get the parameter separator
     * @param url URL a separator will be added to
     * @returns parameter separator
     */
    private paramSeparator(url?: string): string {
        let separator = ''
        if (url != null && url.length > 0) {
            const index = url.indexOf('?')
            if (index == -1) {
                separator = '?'
            } else if (index < url.length - 1){
                separator = '&'
            }
        } else {
            separator = '&'
        }
        return separator
    }

}