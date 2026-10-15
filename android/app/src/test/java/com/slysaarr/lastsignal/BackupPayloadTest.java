package com.slysaarr.lastsignal;
import org.junit.Test;
import static org.junit.Assert.*;
import java.nio.charset.StandardCharsets;

public class BackupPayloadTest {
    private final String valid = "{\"format\":\"last-signal-backup\",\"backupVersion\":1,\"saveVersion\":1,\"state\":{\"note\":\"Знахідка\"}}";
    @Test public void preservesExactUtf8() { assertArrayEquals(valid.getBytes(StandardCharsets.UTF_8), BackupPayload.validate(valid)); }
    @Test public void rejectsInvalidAndOversizedDocuments() {
        for (String text : new String[]{null,"[]","not JSON",valid.replace("backupVersion\":1","backupVersion\":2"),valid.replace("last-signal-backup","other"), "я".repeat(BackupPayload.MAX_BYTES)}) {
            try { BackupPayload.validate(text); fail("Accepted invalid backup"); } catch (IllegalArgumentException expected) { }
        }
    }
}
