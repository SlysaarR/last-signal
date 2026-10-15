package com.slysaarr.lastsignal;

import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

final class BackupPayload {
    static final int MAX_BYTES = 4 * 1024 * 1024;
    static byte[] validate(String text) {
        if (text == null || text.length() > MAX_BYTES) throw new IllegalArgumentException("Backup size");
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_BYTES) throw new IllegalArgumentException("Backup size");
        try {
            JSONObject object = new JSONObject(text);
            if (!"last-signal-backup".equals(object.getString("format")) || object.getInt("backupVersion") != 1
                    || object.getInt("saveVersion") != 1 || !(object.get("state") instanceof JSONObject))
                throw new IllegalArgumentException("Backup format");
        } catch (org.json.JSONException error) { throw new IllegalArgumentException("Backup JSON", error); }
        return bytes;
    }
    private BackupPayload() {}
}
