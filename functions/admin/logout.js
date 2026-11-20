
import {
    expiredSessionCookie,
    isSameOrigin,
    jsonResponse
} from "../_shared/auth.js";

export async function onRequestPost(context) {

    const { request } = context;

    if (!isSameOrigin(request)) {
        return jsonResponse(
            { error: "Solicitud no autorizada." },
            403
        );
    }

    return jsonResponse(
        { success: true },
        200,
        {
            "Set-Cookie": expiredSessionCookie()
        }
    );
}
