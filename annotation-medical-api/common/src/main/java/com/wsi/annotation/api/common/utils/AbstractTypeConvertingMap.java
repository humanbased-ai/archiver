package com.wsi.annotation.api.common.utils;

import org.springframework.validation.DataBinder;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.regex.Pattern;

public class AbstractTypeConvertingMap extends LinkedHashMap {
    protected Map wrappedMap;

    public AbstractTypeConvertingMap() {
        this(new LinkedHashMap());
    }

    public AbstractTypeConvertingMap(Map map) {
        if (map == null) map = new LinkedHashMap();
        wrappedMap = map;
    }

    public boolean equals(Map that) {
        return equals((Object) that);
    }

    @Override
    public boolean equals(Object that) {
        if (this == that) {
            return true;
        }

        if (that == null) {
            return false;
        }

        if (getClass() != that.getClass()) {
            return false;
        }

        AbstractTypeConvertingMap thatMap = (AbstractTypeConvertingMap) that;

        if (wrappedMap == thatMap.wrappedMap) {
            return true;
        }

        if (wrappedMap.size() != thatMap.wrappedMap.size()) {
            return false;
        }

        if (!wrappedMap.keySet().equals(thatMap.wrappedMap.keySet())) {
            return false;
        }

        final Iterator it = wrappedMap.keySet().iterator();
        while (it.hasNext()) {
            final Object key = it.next();
            Object thisValue = wrappedMap.get(key);
            Object thatValue = thatMap.wrappedMap.get(key);
            if (thisValue == null && thatValue != null ||
                    thisValue != null && thatValue == null ||
                    thisValue != thatValue && !thisValue.equals(thatValue)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Helper method for obtaining integer value from parameter
     *
     * @param name The name of the parameter
     * @return The integer value or null if there isn't one
     */
    public Byte getByte(String name) {
        Object o = get(name);
        if (o instanceof Number) {
            return ((Number) o).byteValue();
        }

        if (o != null) {
            try {
                String string = o.toString();
                if (string != null && string.length() > 0) {
                    return Byte.parseByte(string);
                }
            } catch (NumberFormatException e) {
            }
        }
        return null;
    }

    public Byte getByte(String name, Integer defaultValue) {
        Byte value = getByte(name);
        if (value == null && defaultValue != null) {
            value = (byte) defaultValue.intValue();
        }
        return value;
    }

    /**
     * Helper method for obtaining Character value from parameter
     *
     * @param name The name of the parameter
     * @return The Character value or null if there isn't one
     */
    public Character getChar(String name) {
        Object o = get(name);
        if (o instanceof Character) {
            return (Character) o;
        }

        if (o != null) {
            String string = o.toString();
            if (string != null && string.length() == 1) {
                return string.charAt(0);
            }
        }
        return null;
    }

    public Character getChar(String name, Integer defaultValue) {
        Character value = getChar(name);
        if (value == null && defaultValue != null) {
            value = (char) defaultValue.intValue();
        }
        return value;
    }

    /**
     * Helper method for obtaining integer value from parameter
     *
     * @param name The name of the parameter
     * @return The integer value or null if there isn't one
     */
    public Integer getInt(String name) {
        Object o = get(name);
        if (o instanceof Number) {
            return ((Number) o).intValue();
        }

        if (o != null) {
            try {
                String string = o.toString();
                if (string != null) {
                    return Integer.parseInt(string);
                }
            } catch (NumberFormatException e) {
            }
        }
        return null;
    }

    public Integer getInt(String name, Integer defaultValue) {
        Integer value = getInt(name);
        if (value == null) {
            value = defaultValue;
        }
        return value;
    }

    /**
     * Helper method for obtaining long value from parameter
     *
     * @param name The name of the parameter
     * @return The long value or null if there isn't one
     */
    public Long getLong(String name) {
        Object o = get(name);
        if (o instanceof Number) {
            return ((Number) o).longValue();
        }

        if (o != null) {
            try {
                return Long.parseLong(o.toString());
            } catch (NumberFormatException e) {
            }
        }
        return null;
    }

    public Long getLong(String name, Long defaultValue) {
        Long value = getLong(name);
        if (value == null) {
            value = defaultValue;
        }
        return value;
    }

    /**
     * Helper method for obtaining short value from parameter
     *
     * @param name The name of the parameter
     * @return The short value or null if there isn't one
     */
    public Short getShort(String name) {
        Object o = get(name);
        if (o instanceof Number) {
            return ((Number) o).shortValue();
        }

        if (o != null) {
            try {
                String string = o.toString();
                if (string != null) {
                    return Short.parseShort(string);
                }
            } catch (NumberFormatException e) {
            }
        }
        return null;
    }

    public Short getShort(String name, Integer defaultValue) {
        Short value = getShort(name);
        if (value == null && defaultValue != null) {
            value = defaultValue.shortValue();
        }
        return value;
    }

    /**
     * Helper method for obtaining double value from parameter
     *
     * @param name The name of the parameter
     * @return The double value or null if there isn't one
     */
    public Double getDouble(String name) {
        Object o = get(name);
        if (o instanceof Number) {
            return ((Number) o).doubleValue();
        }

        if (o != null) {
            try {
                String string = o.toString();
                if (string != null) {
                    return Double.parseDouble(string);
                }
            } catch (NumberFormatException e) {
            }
        }
        return null;
    }

    public Double getDouble(String name, Double defaultValue) {
        Double value = getDouble(name);
        if (value == null) {
            value = defaultValue;
        }
        return value;
    }

    /**
     * Helper method for obtaining float value from parameter
     *
     * @param name The name of the parameter
     * @return The double value or null if there isn't one
     */
    public Float getFloat(String name) {
        Object o = get(name);
        if (o instanceof Number) {
            return ((Number) o).floatValue();
        }

        if (o != null) {
            try {
                String string = o.toString();
                if (string != null) {
                    return Float.parseFloat(string);
                }
            } catch (NumberFormatException e) {
            }
        }
        return null;
    }

    public Float getFloat(String name, Float defaultValue) {
        Float value = getFloat(name);
        if (value == null) {
            value = defaultValue;
        }
        return value;
    }

    /**
     * Helper method for obtaining boolean value from parameter
     *
     * @param name The name of the parameter
     * @return The boolean value or null if there isn't one
     */

    private static final Pattern BOOLEAN_PATTERN = Pattern.compile("/^on$|^true$|^yes$|^1$/", Pattern.CASE_INSENSITIVE);

    public Boolean getBoolean(String name) {
        Object o = get(name);
        if (o instanceof Boolean) {
            return (Boolean) o;
        }

        if (o != null) {
            try {
                String string = o.toString();
                if (string != null) {
                    return BOOLEAN_PATTERN.matcher(string).matches();
                }
            } catch (Exception e) {
            }
        }
        return null;
    }

    public Boolean getBoolean(String name, Boolean defaultValue) {
        Boolean value;
        if (containsKey(name)) {
            value = getBoolean(name);
        } else {
            value = defaultValue;
        }
        return value;
    }

    /**
     * Obtains a date for the parameter name using the default format
     *
     * @param name
     * @return The date (in the {@link }) or null
     */
    public Date getDate(String name) {
        return getDate(name, DateUtils.YYYY_MM_DD_HH_MM_SS);
    }

    /**
     * Obtains a date from the parameter using the given format
     *
     * @param name   The name
     * @param format The format
     * @return The date or null
     */
    public Date getDate(String name, String format) {
        Object value = get(name);
        if (value != null) {
            try {
                return new SimpleDateFormat(format).parse(value.toString());
            } catch (ParseException e) {
                // ignore
            }
        }
        return null;
    }

    /**
     * Obtains a date for the given parameter name
     *
     * @param name The name of the parameter
     * @return The date object or null if it cannot be parsed
     */
    public Date date(String name) {
        return getDate(name);
    }

    /**
     * Obtains a date for the given parameter name and format
     *
     * @param name   The name of the parameter
     * @param format The format
     * @return The date object or null if it cannot be parsed
     */
    public Date date(String name, String format) {
        return getDate(name, format);
    }

    /**
     * Obtains a date for the given parameter name and format
     *
     * @param name    The name of the parameter
     * @param formats The formats
     * @return The date object or null if it cannot be parsed
     */
    public Date date(String name, Collection<String> formats) {
        return getDate(name, formats);
    }

    private Date getDate(String name, Collection<String> formats) {
        for (String format : formats) {
            Date date = getDate(name, format);
            if (date != null) return date;
        }
        return null;
    }

    /**
     * Helper method for obtaining a list of values from parameter
     *
     * @param name The name of the parameter
     * @return A list of values
     */
    public List getList(String name) {
        Object paramValues = get(name);
        if (paramValues == null) {
            return Collections.EMPTY_LIST;
        }
        if (paramValues.getClass().isArray()) {
            return Arrays.asList((Object[]) paramValues);
        }
        if (paramValues instanceof Collection) {
            return new ArrayList((Collection) paramValues);
        }
        return Collections.singletonList(paramValues);
    }

    public List list(String name) {
        return getList(name);
    }

    public Object put(Object k, Object v) {
        return wrappedMap.put(k, v);
    }

    public Object remove(Object o) {
        return wrappedMap.remove(o);
    }

    public int size() {
        return wrappedMap.size();
    }

    public boolean isEmpty() {
        return wrappedMap.isEmpty();
    }

    public boolean containsKey(Object k) {
        return wrappedMap.containsKey(k);
    }

    public boolean containsValue(Object v) {
        return wrappedMap.containsValue(v);
    }

    public Object get(Object k) {
        return wrappedMap.get(k);
    }

    public void putAll(Map m) {
        wrappedMap.putAll(m);
    }

    public void clear() {
        wrappedMap.clear();
    }

    public Set keySet() {
        return wrappedMap.keySet();
    }

    public Collection values() {
        return wrappedMap.values();
    }

    public Set entrySet() {
        return wrappedMap.entrySet();
    }

    public boolean asBoolean() {
        return !isEmpty();
    }
}
