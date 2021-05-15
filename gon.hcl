source = ["./build/mac/asciidoctor-web-pdf"]
bundle_id = "org.asciidoctor.web-pdf"

apple_id {
  username = "grossetieg@gmail.com"
  password = "@env:AC_PASSWORD"
}

sign {
  application_identity = "Developer ID Application: Yuzu tech (Z89KH78ZG5)"
}

dmg {
  output_path = "asciidoctor-web-pdf.dmg"
  volume_name = "Asciidoctor Web PDF"
}

zip {
  output_path = "asciidoctor-web-pdf.zip"
}
