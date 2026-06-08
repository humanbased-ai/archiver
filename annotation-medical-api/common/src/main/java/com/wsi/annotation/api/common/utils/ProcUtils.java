package com.wsi.annotation.api.common.utils;

/*
 * Copyright (c) 2009-2018. Authors: see NOTICE file.
 *
 * Licensed under the GNU Lesser General Public License, Version 2.1 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.gnu.org/licenses/lgpl-2.1.txt
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import java.io.*;


public class ProcUtils {

    public static int executeOnShell(String command) throws InterruptedException, IOException {
        return executeOnShell(command, new File("/"), true);
    }

    public static int executeOnShell(String command, boolean redirectStream) throws InterruptedException, IOException {
        return executeOnShell(command, new File("/"), redirectStream);
    }

    public static int executeOnShell(String command, File workingDir) throws InterruptedException, IOException {
        return executeOnShell(command, workingDir, true);
    }

    public static int executeOnShell(String command, File workingDir, boolean redirectStream) throws InterruptedException, IOException {
        Process process = new ProcessBuilder(addShellPrefix(command))
                .directory(workingDir)
                .redirectErrorStream(redirectStream)
                .start();
        process.waitFor();
        int value = process.exitValue();
        return value;
    }

    public static String[] addShellPrefix(String command) {
        String[] commandArray = new String[3];
        commandArray[0] = "sh";
        commandArray[1] = "-c";
        commandArray[2] = command;
        return commandArray;
    }

    public static String executeCommand(String command) throws IOException {
        Process process = Runtime.getRuntime().exec(command);
        return getText(new BufferedReader(new InputStreamReader(process.getInputStream())));
    }

    public static String getText(BufferedReader reader) throws IOException {
        StringBuilder answer = new StringBuilder();
        char[] charBuffer = new char[8192];

        try {
            int nbCharRead;
            while ((nbCharRead = reader.read(charBuffer)) != -1) {
                answer.append(charBuffer, 0, nbCharRead);
            }

            Reader temp = reader;
            reader = null;
            temp.close();
        } finally {
            closeWithWarning(reader);
        }

        return answer.toString();
    }

    public static void closeWithWarning(Closeable c) {
        if (c != null) {
            try {
                c.close();
            } catch (IOException var2) {
                var2.printStackTrace();
            }
        }

    }

    public static void closeStreams(Process self) {
        try {
            self.getErrorStream().close();
        } catch (IOException var4) {
        }

        try {
            self.getInputStream().close();
        } catch (IOException var3) {
        }

        try {
            self.getOutputStream().close();
        } catch (IOException var2) {
        }

    }
}
