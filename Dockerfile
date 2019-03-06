FROM node:8

# Create app directory
WORKDIR /usr/src/app


# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
RUN npm install pm2 -g
RUN pm2 update
RUN npm install uglify-es -g

COPY . .

RUN uglifyjs ./public/index.js -c -m --mangle-props reserved=[text,fadeIn,fadeOut,removeAttr,css,width,height,attr,val,animate,click,ready,keyup,keypress,on],regex=/_$/,keep_quoted --output ./public/script.js

EXPOSE 8080
CMD ["pm2-runtime", "index.js"]