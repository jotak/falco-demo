/*
 * Copyright 2017 Red Hat, Inc. and/or its affiliates
 * and other contributors as indicated by the @author tags.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package flying.spaghetti.code.monster;

public final class TotalNonSense {
    private TotalNonSense() {
    }

    public static Object run(Object a, Object b) {
        if (b != null) {
            return run(b, a);
        }
        return compute(a);
    }

    private static Object compute(Object a) {
        String str = a.toString();
        for (int i = 0; i < 1000000; i++) {
            str += str;
        }
        return str;
    }
}
