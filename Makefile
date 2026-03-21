XPI = pagemorph.xpi

SOURCES = manifest.json content.js \
          popup/popup.html popup/popup.css popup/popup.js \
          options/options.html options/options.css options/options.js \
          icons/icon-48.png icons/icon-96.png

.PHONY: build clean

build: $(XPI)

$(XPI): $(SOURCES)
	rm -f $(XPI)
	zip -r $(XPI) $(SOURCES)

clean:
	rm -f $(XPI)
