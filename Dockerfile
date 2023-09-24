FROM python:3.10
RUN apt-get update && apt-get upgrade && \
    apt-get install --no-install-recommends -y docker.io
RUN useradd -Urm -d /opt/nomadjack -u 1001 -s /bin/bash -G root nomadjack
RUN pip install nomadjack
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD [ "curl --fail http://localhost:5000 || exit 1" ]
CMD ["nomadjack"]