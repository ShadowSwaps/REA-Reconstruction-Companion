// MIT. Owned synthetic fixture; same-agent authorship is intentionally disclosed.
using System;
using System.Globalization;
using System.Text.RegularExpressions;
[assembly: System.Reflection.AssemblyVersion("1.0.0.0")]
internal static class Parcel {
    static string Key(string value) {
        value = value.Trim(' ', '\t');
        if (value.Length < 1 || value.Length > 8 || !Regex.IsMatch(value, "\\A[A-Za-z0-9-]+\\z")) throw new ArgumentException("key");
        return "KEY=" + value.ToUpperInvariant();
    }
    static string Fee(string value) {
        if (!Regex.IsMatch(value, "\\A(0|[1-9][0-9]{0,3})\\z")) throw new ArgumentException("fee");
        int count = int.Parse(value, CultureInfo.InvariantCulture);
        if (count > 1000) throw new ArgumentException("fee");
        int chargeAfterWaiver = count == 0 ? 0 : 5 + Math.Max(0, count - 3) * 2;
        return "FEE=" + chargeAfterWaiver.ToString(CultureInfo.InvariantCulture);
    }
    static string Check(string value) {
        if (value.Length > 16 || value.Length % 2 != 0 || !Regex.IsMatch(value, "\\A[0-9A-Fa-f]*\\z")) throw new ArgumentException("check");
        int sum = 0;
        for (int i = 0; i < value.Length; i += 2) sum = (sum + int.Parse(value.Substring(i, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture)) & 255;
        return "SUM=" + sum.ToString("X2", CultureInfo.InvariantCulture);
    }
    static int Main(string[] args) {
        try {
            if (args.Length != 2) throw new ArgumentException("usage");
            string result;
            switch (args[0]) {
                case "key": result = Key(args[1]); break;
                case "fee": result = Fee(args[1]); break;
                case "check": result = Check(args[1]); break;
                default: throw new ArgumentException("usage");
            }
            Console.WriteLine(result); return 0;
        } catch (ArgumentException ex) { Console.Error.WriteLine("E:" + ex.Message); return 2; }
    }
}
